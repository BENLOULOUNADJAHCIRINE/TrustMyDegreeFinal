const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InternshipRegistry", function () {
    let contract;
    let owner, school, other;

    const now = Math.floor(Date.now() / 1000);

    const sampleInternship = {
        studentId:      "20210001",
        studentName:    "Cirine Benloulous",
        companyName:    "Sonatrach",
        internshipRole: "Software Engineer Intern",
        internshipCity: "Algiers",
        ipfsHash:       "QmExampleHash123",
        startDate:      now,
        endDate:        now + 7776000 // +90 days
    };

    beforeEach(async function () {
        [owner, school, other] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory("InternshipRegistry");
        contract = await Contract.deploy();
        await contract.waitForDeployment();

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

    // ─── Issue ───────────────────────────────────────────────

    it("should issue an internship certificate", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(l => l.fragment?.name === "InternshipIssued");
        expect(event).to.not.be.undefined;
    });

    it("should emit InternshipIssued event", async function () {
        await expect(
            contract.connect(school).issueInternship(
                sampleInternship.studentId, sampleInternship.studentName,
                sampleInternship.companyName, sampleInternship.internshipRole,
                sampleInternship.internshipCity, sampleInternship.ipfsHash,
                sampleInternship.startDate, sampleInternship.endDate
            )
        ).to.emit(contract, "InternshipIssued");
    });

    it("should reject issueInternship from unauthorized school", async function () {
        await expect(
            contract.connect(other).issueInternship(
                sampleInternship.studentId, sampleInternship.studentName,
                sampleInternship.companyName, sampleInternship.internshipRole,
                sampleInternship.internshipCity, sampleInternship.ipfsHash,
                sampleInternship.startDate, sampleInternship.endDate
            )
        ).to.be.revertedWith("Not an authorized school");
    });

    it("should reject if endDate is before startDate", async function () {
        await expect(
            contract.connect(school).issueInternship(
                sampleInternship.studentId, sampleInternship.studentName,
                sampleInternship.companyName, sampleInternship.internshipRole,
                sampleInternship.internshipCity, sampleInternship.ipfsHash,
                sampleInternship.endDate, sampleInternship.startDate // swapped
            )
        ).to.be.revertedWith("End date must be after start date");
    });

    it("should reject duplicate active internship certificate", async function () {
        await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        await expect(
            contract.connect(school).issueInternship(
                sampleInternship.studentId, sampleInternship.studentName,
                sampleInternship.companyName, sampleInternship.internshipRole,
                sampleInternship.internshipCity, sampleInternship.ipfsHash,
                sampleInternship.startDate, sampleInternship.endDate
            )
        ).to.be.revertedWith("An active internship certificate already exists for this company");
    });

    it("should reject missing required fields", async function () {
        await expect(
            contract.connect(school).issueInternship(
                "", sampleInternship.studentName, sampleInternship.companyName,
                sampleInternship.internshipRole, sampleInternship.internshipCity,
                sampleInternship.ipfsHash, sampleInternship.startDate, sampleInternship.endDate
            )
        ).to.be.revertedWith("Student ID required");
    });

    // ─── Revoke ──────────────────────────────────────────────

    it("should revoke a certificate", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await contract.revokeCertificate(certId);
        const cert = await contract.getCertificate(certId);
        expect(cert.isRevoked).to.equal(true);
    });

    it("should emit InternshipRevoked event", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await expect(contract.revokeCertificate(certId))
            .to.emit(contract, "InternshipRevoked")
            .withArgs(certId, owner.address);
    });

    it("should reject revoking already revoked certificate", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await contract.revokeCertificate(certId);
        await expect(contract.revokeCertificate(certId))
            .to.be.revertedWith("Certificate already revoked");
    });

    // ─── Unrevoke ────────────────────────────────────────────

    it("should unrevoke a certificate", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await contract.revokeCertificate(certId);
        await contract.unrevokeCertificate(certId);
        const cert = await contract.getCertificate(certId);
        expect(cert.isRevoked).to.equal(false);
    });

    it("should emit InternshipUnrevoked event", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await contract.revokeCertificate(certId);
        await expect(contract.unrevokeCertificate(certId))
            .to.emit(contract, "InternshipUnrevoked")
            .withArgs(certId, owner.address);
    });

    it("should reject unrevoking a non-revoked certificate", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await expect(contract.unrevokeCertificate(certId))
            .to.be.revertedWith("Certificate is not revoked");
    });

    // ─── Revoke → Reissue flow ───────────────────────────────

    it("should allow reissue after revoke (corrected internship flow)", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await contract.revokeCertificate(certId);

        await expect(
            contract.connect(school).issueInternship(
                sampleInternship.studentId, sampleInternship.studentName,
                sampleInternship.companyName, sampleInternship.internshipRole,
                sampleInternship.internshipCity, "QmCorrectedHash456",
                sampleInternship.startDate, sampleInternship.endDate
            )
        ).to.emit(contract, "InternshipIssued");
    });

    it("should block reissue if unrevoked (active again)", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await contract.revokeCertificate(certId);
        await contract.unrevokeCertificate(certId);

        await expect(
            contract.connect(school).issueInternship(
                sampleInternship.studentId, sampleInternship.studentName,
                sampleInternship.companyName, sampleInternship.internshipRole,
                sampleInternship.internshipCity, "QmAnotherHash789",
                sampleInternship.startDate, sampleInternship.endDate
            )
        ).to.be.revertedWith("An active internship certificate already exists for this company");
    });

    // ─── Read / Verify ───────────────────────────────────────

    it("should verify an active certificate as true", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        expect(await contract.verifyCertificate(certId)).to.equal(true);
    });

    it("should verify a revoked certificate as false", async function () {
        const tx = await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "InternshipIssued").args[0];

        await contract.revokeCertificate(certId);
        expect(await contract.verifyCertificate(certId)).to.equal(false);
    });

    it("should return student certificates", async function () {
        await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        const certs = await contract.getStudentCertificates(sampleInternship.studentId);
        expect(certs.length).to.equal(1);
    });

    it("should return correct certificate count", async function () {
        await contract.connect(school).issueInternship(
            sampleInternship.studentId, sampleInternship.studentName,
            sampleInternship.companyName, sampleInternship.internshipRole,
            sampleInternship.internshipCity, sampleInternship.ipfsHash,
            sampleInternship.startDate, sampleInternship.endDate
        );
        expect(await contract.getCertificateCount(sampleInternship.studentId)).to.equal(1);
    });

    it("should revert getCertificate for non-existent certId", async function () {
        const fakeId = ethers.encodeBytes32String("fake");
        await expect(contract.getCertificate(fakeId))
            .to.be.revertedWith("Certificate does not exist");
    });
});
