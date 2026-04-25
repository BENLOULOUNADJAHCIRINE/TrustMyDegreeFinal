const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentRegistry", function () {
    let contract;
    let owner, school, other;

    const sampleDoc = {
        studentId:    "20210001",
        studentName:  "Cirine Benloulous",
        documentType: "Transcript",
        ipfsHash:     "QmExampleHash123"
    };

    beforeEach(async function () {
        [owner, school, other] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory("DocumentRegistry");
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

    // ─── Issue ───────────────────────────────────────────────

    it("should issue a document", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(l => l.fragment?.name === "DocumentIssued");
        expect(event).to.not.be.undefined;
    });

    it("should emit DocumentIssued event", async function () {
        await expect(
            contract.connect(school).issueDocument(
                sampleDoc.studentId, sampleDoc.studentName,
                sampleDoc.documentType, sampleDoc.ipfsHash
            )
        ).to.emit(contract, "DocumentIssued");
    });

    it("should reject issueDocument from unauthorized school", async function () {
        await expect(
            contract.connect(other).issueDocument(
                sampleDoc.studentId, sampleDoc.studentName,
                sampleDoc.documentType, sampleDoc.ipfsHash
            )
        ).to.be.revertedWith("Not an authorized school");
    });

    it("should reject duplicate active document", async function () {
        await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        await expect(
            contract.connect(school).issueDocument(
                sampleDoc.studentId, sampleDoc.studentName,
                sampleDoc.documentType, sampleDoc.ipfsHash
            )
        ).to.be.revertedWith("An active document of this type already exists");
    });

    it("should reject missing required fields", async function () {
        await expect(
            contract.connect(school).issueDocument("", sampleDoc.studentName, sampleDoc.documentType, sampleDoc.ipfsHash)
        ).to.be.revertedWith("Student ID required");

        await expect(
            contract.connect(school).issueDocument(sampleDoc.studentId, "", sampleDoc.documentType, sampleDoc.ipfsHash)
        ).to.be.revertedWith("Student name required");

        await expect(
            contract.connect(school).issueDocument(sampleDoc.studentId, sampleDoc.studentName, "", sampleDoc.ipfsHash)
        ).to.be.revertedWith("Document type required");

        await expect(
            contract.connect(school).issueDocument(sampleDoc.studentId, sampleDoc.studentName, sampleDoc.documentType, "")
        ).to.be.revertedWith("IPFS hash required");
    });

    // ─── Revoke ──────────────────────────────────────────────

    it("should revoke a document", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await contract.revokeDocument(docId);
        const doc = await contract.getDocument(docId);
        expect(doc.isRevoked).to.equal(true);
    });

    it("should emit DocumentRevoked event", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await expect(contract.revokeDocument(docId))
            .to.emit(contract, "DocumentRevoked")
            .withArgs(docId, owner.address);
    });

    it("should reject revoking already revoked document", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await contract.revokeDocument(docId);
        await expect(contract.revokeDocument(docId))
            .to.be.revertedWith("Document already revoked");
    });

    it("should reject revoke from unauthorized address", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await expect(contract.connect(other).revokeDocument(docId))
            .to.be.revertedWith("Not authorized");
    });

    // ─── Unrevoke ────────────────────────────────────────────

    it("should unrevoke a document", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await contract.revokeDocument(docId);
        await contract.unrevokeDocument(docId);
        const doc = await contract.getDocument(docId);
        expect(doc.isRevoked).to.equal(false);
    });

    it("should emit DocumentUnrevoked event", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await contract.revokeDocument(docId);
        await expect(contract.unrevokeDocument(docId))
            .to.emit(contract, "DocumentUnrevoked")
            .withArgs(docId, owner.address);
    });

    it("should reject unrevoking a non-revoked document", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await expect(contract.unrevokeDocument(docId))
            .to.be.revertedWith("Document is not revoked");
    });

    // ─── Revoke → Reissue flow ───────────────────────────────

    it("should allow reissue after revoke (corrected document flow)", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await contract.revokeDocument(docId);

        await expect(
            contract.connect(school).issueDocument(
                sampleDoc.studentId, sampleDoc.studentName,
                sampleDoc.documentType, "QmCorrectedHash456"
            )
        ).to.emit(contract, "DocumentIssued");
    });

    it("should block reissue if unrevoked (active again)", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await contract.revokeDocument(docId);
        await contract.unrevokeDocument(docId);

        await expect(
            contract.connect(school).issueDocument(
                sampleDoc.studentId, sampleDoc.studentName,
                sampleDoc.documentType, "QmAnotherHash789"
            )
        ).to.be.revertedWith("An active document of this type already exists");
    });

    // ─── Read / Verify ───────────────────────────────────────

    it("should verify an active document as true", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        expect(await contract.verifyDocument(docId)).to.equal(true);
    });

    it("should verify a revoked document as false", async function () {
        const tx = await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const receipt = await tx.wait();
        const docId = receipt.logs.find(l => l.fragment?.name === "DocumentIssued").args[0];

        await contract.revokeDocument(docId);
        expect(await contract.verifyDocument(docId)).to.equal(false);
    });

    it("should return student documents", async function () {
        await contract.connect(school).issueDocument(
            sampleDoc.studentId, sampleDoc.studentName,
            sampleDoc.documentType, sampleDoc.ipfsHash
        );
        const docs = await contract.getStudentDocuments(sampleDoc.studentId);
        expect(docs.length).to.equal(1);
    });

    it("should revert getDocument for non-existent docId", async function () {
        const fakeId = ethers.encodeBytes32String("fake");
        await expect(contract.getDocument(fakeId))
            .to.be.revertedWith("Document does not exist");
    });
});
