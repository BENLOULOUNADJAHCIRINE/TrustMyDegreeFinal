const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StudyCertificateRegistry", function () {
    let contract;
    let owner, school, other;

    const sampleCert = {
        studentId:       "20210001",
        studentName:     "Cirine Benloulous",
        programName:     "Master Informatique",
        academicYear:    "2024-2025",
        certificateType: "en cours",
        ipfsHash:        "QmExampleHash123"
    };

    beforeEach(async function () {
        [owner, school, other] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory("StudyCertificateRegistry");
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

    it("should issue a study certificate", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued");
        expect(event).to.not.be.undefined;
    });

    it("should emit StudyCertificateIssued event", async function () {
        await expect(
            contract.connect(school).issueStudyCertificate(
                sampleCert.studentId, sampleCert.studentName,
                sampleCert.programName, sampleCert.academicYear,
                sampleCert.certificateType, sampleCert.ipfsHash
            )
        ).to.emit(contract, "StudyCertificateIssued");
    });

    it("should reject issueStudyCertificate from unauthorized school", async function () {
        await expect(
            contract.connect(other).issueStudyCertificate(
                sampleCert.studentId, sampleCert.studentName,
                sampleCert.programName, sampleCert.academicYear,
                sampleCert.certificateType, sampleCert.ipfsHash
            )
        ).to.be.revertedWith("Not an authorized school");
    });

    it("should reject duplicate active certificate (same year + type)", async function () {
        await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        await expect(
            contract.connect(school).issueStudyCertificate(
                sampleCert.studentId, sampleCert.studentName,
                sampleCert.programName, sampleCert.academicYear,
                sampleCert.certificateType, sampleCert.ipfsHash
            )
        ).to.be.revertedWith("An active certificate already exists for this year and type");
    });

    it("should allow different year + type for same student", async function () {
        await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        await expect(
            contract.connect(school).issueStudyCertificate(
                sampleCert.studentId, sampleCert.studentName,
                sampleCert.programName, "2023-2024",
                "terminée", "QmDifferentHash"
            )
        ).to.emit(contract, "StudyCertificateIssued");
    });

    it("should reject missing required fields", async function () {
        await expect(
            contract.connect(school).issueStudyCertificate(
                "", sampleCert.studentName, sampleCert.programName,
                sampleCert.academicYear, sampleCert.certificateType, sampleCert.ipfsHash
            )
        ).to.be.revertedWith("Student ID required");

        await expect(
            contract.connect(school).issueStudyCertificate(
                sampleCert.studentId, sampleCert.studentName, sampleCert.programName,
                "", sampleCert.certificateType, sampleCert.ipfsHash
            )
        ).to.be.revertedWith("Academic year required");
    });

    // ─── Revoke ──────────────────────────────────────────────

    it("should revoke a certificate", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await contract.revokeCertificate(certId);
        const cert = await contract.getCertificate(certId);
        expect(cert.isRevoked).to.equal(true);
    });

    it("should emit StudyCertificateRevoked event", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await expect(contract.revokeCertificate(certId))
            .to.emit(contract, "StudyCertificateRevoked")
            .withArgs(certId, owner.address);
    });

    it("should reject revoking already revoked certificate", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await contract.revokeCertificate(certId);
        await expect(contract.revokeCertificate(certId))
            .to.be.revertedWith("Certificate already revoked");
    });

    // ─── Unrevoke ────────────────────────────────────────────

    it("should unrevoke a certificate", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await contract.revokeCertificate(certId);
        await contract.unrevokeCertificate(certId);
        const cert = await contract.getCertificate(certId);
        expect(cert.isRevoked).to.equal(false);
    });

    it("should emit StudyCertificateUnrevoked event", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await contract.revokeCertificate(certId);
        await expect(contract.unrevokeCertificate(certId))
            .to.emit(contract, "StudyCertificateUnrevoked")
            .withArgs(certId, owner.address);
    });

    it("should reject unrevoking a non-revoked certificate", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await expect(contract.unrevokeCertificate(certId))
            .to.be.revertedWith("Certificate is not revoked");
    });

    // ─── Revoke → Reissue flow ───────────────────────────────

    it("should allow reissue after revoke (corrected certificate flow)", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await contract.revokeCertificate(certId);

        await expect(
            contract.connect(school).issueStudyCertificate(
                sampleCert.studentId, sampleCert.studentName,
                sampleCert.programName, sampleCert.academicYear,
                sampleCert.certificateType, "QmCorrectedHash456"
            )
        ).to.emit(contract, "StudyCertificateIssued");
    });

    it("should block reissue if unrevoked (active again)", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await contract.revokeCertificate(certId);
        await contract.unrevokeCertificate(certId);

        await expect(
            contract.connect(school).issueStudyCertificate(
                sampleCert.studentId, sampleCert.studentName,
                sampleCert.programName, sampleCert.academicYear,
                sampleCert.certificateType, "QmAnotherHash789"
            )
        ).to.be.revertedWith("An active certificate already exists for this year and type");
    });

    // ─── Read / Verify ───────────────────────────────────────

    it("should verify an active certificate as true", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        expect(await contract.verifyCertificate(certId)).to.equal(true);
    });

    it("should verify a revoked certificate as false", async function () {
        const tx = await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const receipt = await tx.wait();
        const certId = receipt.logs.find(l => l.fragment?.name === "StudyCertificateIssued").args[0];

        await contract.revokeCertificate(certId);
        expect(await contract.verifyCertificate(certId)).to.equal(false);
    });

    it("should return student certificates", async function () {
        await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        const certs = await contract.getStudentCertificates(sampleCert.studentId);
        expect(certs.length).to.equal(1);
    });

    it("should return correct certificate count", async function () {
        await contract.connect(school).issueStudyCertificate(
            sampleCert.studentId, sampleCert.studentName,
            sampleCert.programName, sampleCert.academicYear,
            sampleCert.certificateType, sampleCert.ipfsHash
        );
        expect(await contract.getCertificateCount(sampleCert.studentId)).to.equal(1);
    });

    it("should revert getCertificate for non-existent certId", async function () {
        const fakeId = ethers.encodeBytes32String("fake");
        await expect(contract.getCertificate(fakeId))
            .to.be.revertedWith("Certificate does not exist");
    });
});
