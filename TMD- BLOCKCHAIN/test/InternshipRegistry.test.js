const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InternshipRegistry", function () {
  let registry;
  let owner;
  let school;
  let randomUser;

  const studentId   = "STU2024001";
  const studentName = "Ines Benali";
  const companyName = "Sonatrach";
  const role        = "Software Engineer Intern";
  const ipfsHash    = "QmX7b5jxn2VTkWFmNgMMnpbBzKL4vPjbPbCRXfAmnMBGpK";
  const schoolName  = "Ecole Nationale Polytechnique";
  const startDate   = 1700000000;
  const endDate     = 1710000000;

  beforeEach(async function () {
    [owner, school, randomUser] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("InternshipRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  // ─────────────────────────────────────────────
  //  DEPLOYMENT
  // ─────────────────────────────────────────────

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });
  });

  // ─────────────────────────────────────────────
  //  SCHOOL AUTHORIZATION
  // ─────────────────────────────────────────────

  describe("School Authorization", function () {
    it("Owner can authorize a school", async function () {
      await registry.authorizeSchool(school.address, schoolName);
      expect(await registry.authorizedSchools(school.address)).to.equal(true);
    });

    it("Non-owner cannot authorize a school", async function () {
      await expect(
        registry.connect(randomUser).authorizeSchool(school.address, schoolName)
      ).to.be.revertedWith("Not the contract owner");
    });

    it("Cannot authorize the same school twice", async function () {
      await registry.authorizeSchool(school.address, schoolName);
      await expect(
        registry.authorizeSchool(school.address, schoolName)
      ).to.be.revertedWith("School already authorized");
    });

    it("Owner can revoke a school", async function () {
      await registry.authorizeSchool(school.address, schoolName);
      await registry.revokeSchoolAuthorization(school.address);
      expect(await registry.authorizedSchools(school.address)).to.equal(false);
    });

    it("Revoked school cannot issue certificates", async function () {
      await registry.authorizeSchool(school.address, schoolName);
      await registry.revokeSchoolAuthorization(school.address);
      await expect(
        registry.connect(school).issueInternship(studentId, studentName, companyName, role, ipfsHash, startDate, endDate)
      ).to.be.revertedWith("Not an authorized school");
    });
  });

  // ─────────────────────────────────────────────
  //  ISSUING INTERNSHIP CERTIFICATES
  // ─────────────────────────────────────────────

  describe("Issuing Internship Certificates", function () {
    beforeEach(async function () {
      await registry.authorizeSchool(school.address, schoolName);
    });

    it("Authorized school can issue an internship certificate", async function () {
      const tx = await registry.connect(school).issueInternship(
        studentId, studentName, companyName, role, ipfsHash, startDate, endDate
      );
      await expect(tx).to.emit(registry, "InternshipIssued");
    });

    it("Unauthorized address cannot issue", async function () {
      await expect(
        registry.connect(randomUser).issueInternship(studentId, studentName, companyName, role, ipfsHash, startDate, endDate)
      ).to.be.revertedWith("Not an authorized school");
    });

    it("Cannot issue with empty student ID", async function () {
      await expect(
        registry.connect(school).issueInternship("", studentName, companyName, role, ipfsHash, startDate, endDate)
      ).to.be.revertedWith("Student ID required");
    });

    it("Cannot issue with empty company name", async function () {
      await expect(
        registry.connect(school).issueInternship(studentId, studentName, "", role, ipfsHash, startDate, endDate)
      ).to.be.revertedWith("Company name required");
    });

    it("Cannot issue with endDate before startDate", async function () {
      await expect(
        registry.connect(school).issueInternship(studentId, studentName, companyName, role, ipfsHash, endDate, startDate)
      ).to.be.revertedWith("End date must be after start date");
    });

    it("Cannot issue duplicate internship for same student and company", async function () {
      await registry.connect(school).issueInternship(studentId, studentName, companyName, role, ipfsHash, startDate, endDate);
      await expect(
        registry.connect(school).issueInternship(studentId, studentName, companyName, role, ipfsHash, startDate, endDate)
      ).to.be.revertedWith("Internship certificate already issued for this company");
    });

    it("Student can have internships at different companies", async function () {
      await registry.connect(school).issueInternship(studentId, studentName, "Sonatrach", role, ipfsHash, startDate, endDate);
      await registry.connect(school).issueInternship(studentId, studentName, "Djezzy", role, ipfsHash, startDate, endDate);
      expect(await registry.getCertificateCount(studentId)).to.equal(2);
    });
  });

  // ─────────────────────────────────────────────
  //  GETTING CERTIFICATES
  // ─────────────────────────────────────────────

  describe("Getting Certificates", function () {
    let certId;

    beforeEach(async function () {
      await registry.authorizeSchool(school.address, schoolName);
      const tx = await registry.connect(school).issueInternship(
        studentId, studentName, companyName, role, ipfsHash, startDate, endDate
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "InternshipIssued");
      certId = event.args.certId;
    });

    it("Can get certificate details by certId", async function () {
      const cert = await registry.getCertificate(certId);
      expect(cert.studentId).to.equal(studentId);
      expect(cert.studentName).to.equal(studentName);
      expect(cert.companyName).to.equal(companyName);
      expect(cert.internshipRole).to.equal(role);
      expect(cert.ipfsHash).to.equal(ipfsHash);
      expect(cert.startDate).to.equal(startDate);
      expect(cert.endDate).to.equal(endDate);
      expect(cert.isRevoked).to.equal(false);
    });

    it("Can get all certificate IDs for a student", async function () {
      const certs = await registry.getStudentCertificates(studentId);
      expect(certs.length).to.equal(1);
      expect(certs[0]).to.equal(certId);
    });

    it("Returns empty array for unknown student", async function () {
      const certs = await registry.getStudentCertificates("UNKNOWN999");
      expect(certs.length).to.equal(0);
    });

    it("Reverts when getting non-existent certificate", async function () {
      const fakeCertId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(registry.getCertificate(fakeCertId)).to.be.revertedWith("Certificate does not exist");
    });
  });

  // ─────────────────────────────────────────────
  //  VERIFICATION
  // ─────────────────────────────────────────────

  describe("Verification", function () {
    let certId;

    beforeEach(async function () {
      await registry.authorizeSchool(school.address, schoolName);
      const tx = await registry.connect(school).issueInternship(
        studentId, studentName, companyName, role, ipfsHash, startDate, endDate
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "InternshipIssued");
      certId = event.args.certId;
    });

    it("Valid certificate returns true", async function () {
      expect(await registry.verifyCertificate(certId)).to.equal(true);
    });

    it("Non-existent certificate returns false", async function () {
      const fakeCertId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      expect(await registry.verifyCertificate(fakeCertId)).to.equal(false);
    });
  });

  // ─────────────────────────────────────────────
  //  REVOCATION
  // ─────────────────────────────────────────────

  describe("Revocation", function () {
    let certId;

    beforeEach(async function () {
      await registry.authorizeSchool(school.address, schoolName);
      const tx = await registry.connect(school).issueInternship(
        studentId, studentName, companyName, role, ipfsHash, startDate, endDate
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "InternshipIssued");
      certId = event.args.certId;
    });

    it("Issuing school can revoke a certificate", async function () {
      await registry.connect(school).revokeCertificate(certId);
      expect(await registry.verifyCertificate(certId)).to.equal(false);
    });

    it("Owner can revoke any certificate", async function () {
      await registry.revokeCertificate(certId);
      expect(await registry.verifyCertificate(certId)).to.equal(false);
    });

    it("Random user cannot revoke", async function () {
      await expect(
        registry.connect(randomUser).revokeCertificate(certId)
      ).to.be.revertedWith("Not authorized to revoke");
    });

    it("Cannot revoke an already revoked certificate", async function () {
      await registry.connect(school).revokeCertificate(certId);
      await expect(
        registry.connect(school).revokeCertificate(certId)
      ).to.be.revertedWith("Certificate already revoked");
    });

    it("Revoked certificate returns false on verify", async function () {
      await registry.connect(school).revokeCertificate(certId);
      expect(await registry.verifyCertificate(certId)).to.equal(false);
    });
  });
});
