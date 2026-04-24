const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiplomaRegistry", function () {
    let contract;
    let owner, school, other;

    const sampleDiploma = {
        studentId:    "20210001",
        studentName:  "Cirine Benloulous",
        degreeName:   "Ingenieur",
        fieldOfStudy: "MI",
        ipfsHash:     "QmExampleHash123"
    };

    beforeEach(async function () {
        [owner, school, other] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory("DiplomaRegistry");
        contract = await Contract.deploy();
        await contract.waitForDeployment();

        // authorize school before each test
        await contract.authorizeSchool(school.address, "ESI Algiers");
    });

    // ─── School management ───────────────────────────────────

    it("should authorize a school", async function () {
        expect(await contract.authorizedSchools(school.address)).to.equal(true);
        expect(await contract.schoolNames(school.address)).to.equal("ESI Algiers");
    });

    it("should emit SchoolAuthorized event", async function () {
        const [, , , newSchool] = await ethers.getSigners();
        await expect(contract.authorizeSchool(newSchool.address, "USTHB"))
            .to.emit(contract, "SchoolAuthorized")
            .withArgs(newSchool.address, "USTHB");
    });

    it("should reject duplicate school authorization", async function () {
        await expect(contract.authorizeSchool(school.address, "ESI Algiers"))
            .to.be.revertedWith("School already authorized");
    });

    it("should revoke school authorization", async function () {
        await contract.revokeSchoolAuthorization(school.address);
        expect(await contract.authorizedSchools(school.address)).to.equal(false);
    });

    it("should transfer ownership", async function () {
        await contract.transferOwnership(other.address);
        expect(await contract.owner()).to.equal(other.address);
    });

    it("should reject transferOwnership from non-owner", async function () {
        await expect(contract.connect(other).transferOwnership(other.address))
            .to.be.revertedWith("Not the contract owner");
    });

    // ─── Issue ───────────────────────────────────────────────

    it("should issue a diploma", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued");
        expect(event).to.not.be.undefined;
    });

    it("should emit DiplomaIssued event", async function () {
        await expect(
            contract.connect(school).issueDiploma(
                sampleDiploma.studentId, sampleDiploma.studentName,
                sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
            )
        ).to.emit(contract, "DiplomaIssued");
    });

    it("should reject issueDiploma from unauthorized school", async function () {
        await expect(
            contract.connect(other).issueDiploma(
                sampleDiploma.studentId, sampleDiploma.studentName,
                sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
            )
        ).to.be.revertedWith("Not an authorized school");
    });

    it("should reject duplicate active diploma", async function () {
        await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        await expect(
            contract.connect(school).issueDiploma(
                sampleDiploma.studentId, sampleDiploma.studentName,
                sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
            )
        ).to.be.revertedWith("An active diploma already exists for this degree");
    });

    // ─── Revoke ──────────────────────────────────────────────

    it("should revoke a diploma", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued");
        const certId = event.args[0];

        await contract.revokeDiploma(certId);
        const diploma = await contract.getDiploma(certId);
        expect(diploma.isRevoked).to.equal(true);
    });

    it("should emit DiplomaRevoked event", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued").args[0];

        await expect(contract.revokeDiploma(certId))
            .to.emit(contract, "DiplomaRevoked")
            .withArgs(certId, owner.address);
    });

    it("should reject revoking already revoked diploma", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued").args[0];

        await contract.revokeDiploma(certId);
        await expect(contract.revokeDiploma(certId))
            .to.be.revertedWith("Diploma already revoked");
    });

    // ─── Unrevoke ────────────────────────────────────────────

    it("should unrevoke a diploma", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued").args[0];

        await contract.revokeDiploma(certId);
        await contract.unrevokeDiploma(certId);
        const diploma = await contract.getDiploma(certId);
        expect(diploma.isRevoked).to.equal(false);
    });

    it("should emit DiplomaUnrevoked event", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued").args[0];

        await contract.revokeDiploma(certId);
        await expect(contract.unrevokeDiploma(certId))
            .to.emit(contract, "DiplomaUnrevoked")
            .withArgs(certId, owner.address);
    });

    it("should reject unrevoking a non-revoked diploma", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued").args[0];

        await expect(contract.unrevokeDiploma(certId))
            .to.be.revertedWith("Diploma is not revoked");
    });

    // ─── Revoke → Reissue flow ───────────────────────────────

    it("should allow reissue after revoke (corrected diploma flow)", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued").args[0];

        await contract.revokeDiploma(certId);

        await expect(
            contract.connect(school).issueDiploma(
                sampleDiploma.studentId, sampleDiploma.studentName,
                sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, "QmCorrectedHash456"
            )
        ).to.emit(contract, "DiplomaIssued");
    });

    // ─── Read / Verify ───────────────────────────────────────

    it("should verify an active diploma as true", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued").args[0];

        expect(await contract.verifyDiploma(certId)).to.equal(true);
    });

    it("should verify a revoked diploma as false", async function () {
        const tx = await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "DiplomaIssued").args[0];

        await contract.revokeDiploma(certId);
        expect(await contract.verifyDiploma(certId)).to.equal(false);
    });

    it("should return student diplomas", async function () {
        await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        const diplomas = await contract.getStudentDiplomas(sampleDiploma.studentId);
        expect(diplomas.length).to.equal(1);
    });

    it("should return correct diploma count", async function () {
        await contract.connect(school).issueDiploma(
            sampleDiploma.studentId, sampleDiploma.studentName,
            sampleDiploma.degreeName, sampleDiploma.fieldOfStudy, sampleDiploma.ipfsHash
        );
        expect(await contract.getDiplomaCount(sampleDiploma.studentId)).to.equal(1);
    });

    it("should revert getDiploma for non-existent certId", async function () {
        const fakeId = ethers.encodeBytes32String("fake");
        await expect(contract.getDiploma(fakeId))
            .to.be.revertedWith("Diploma does not exist");
    });
});
