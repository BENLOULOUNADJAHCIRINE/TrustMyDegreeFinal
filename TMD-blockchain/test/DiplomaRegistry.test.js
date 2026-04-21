const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiplomaRegistry", function () {
  let registry;
  let owner;
  let school;
  let otherSchool;
  let randomUser;

  const studentId    = "STU2024001";
  const studentName  = "Ines Benali";
  const degreeName   = "Master's Degree";
  const fieldOfStudy = "Mathematics and Informatics";
  const ipfsHash     = "QmX7b5jxn2VTkWFmNgMMnpbBzKL4vPjbPbCRXfAmnMBGpK";
  const schoolName   = "Ecole Nationale Polytechnique";

  beforeEach(async function () {
    [owner, school, otherSchool, randomUser] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DiplomaRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });


  //  deployement


  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });
  });

  // admins autorizations

  describe("School Authorization", function () {
    it("Owner can authorize a school", async function () {
      await registry.authorizeSchool(school.address, schoolName);
      expect(await registry.authorizedSchools(school.address)).to.equal(true);
      expect(await registry.schoolNames(school.address)).to.equal(schoolName);
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

    it("Owner can revoke a school's authorization", async function () {
      await registry.authorizeSchool(school.address, schoolName);
      await registry.revokeSchoolAuthorization(school.address);
      expect(await registry.authorizedSchools(school.address)).to.equal(false);
    });

    it("Revoked school cannot issue diplomas", async function () {
      await registry.authorizeSchool(school.address, schoolName);
      await registry.revokeSchoolAuthorization(school.address);
      await expect(
        registry.connect(school).issueDiploma(studentId, studentName, degreeName, fieldOfStudy, ipfsHash)
      ).to.be.revertedWith("Not an authorized school");
    });
  });


  // diploma setters


  describe("Issuing Diplomas", function () {
    beforeEach(async function () {
      await registry.authorizeSchool(school.address, schoolName);
    });

    it("Authorized school can issue a diploma", async function () {
      const tx = await registry.connect(school).issueDiploma(
        studentId, studentName, degreeName, fieldOfStudy, ipfsHash
      );
      await expect(tx).to.emit(registry, "DiplomaIssued");
    });

    it("Unauthorized address cannot issue a diploma", async function () {
      await expect(
        registry.connect(randomUser).issueDiploma(studentId, studentName, degreeName, fieldOfStudy, ipfsHash)
      ).to.be.revertedWith("Not an authorized school");
    });

    it("Cannot issue diploma with empty student ID", async function () {
      await expect(
        registry.connect(school).issueDiploma("", studentName, degreeName, fieldOfStudy, ipfsHash)
      ).to.be.revertedWith("Student ID required");
    });

    it("Cannot issue diploma with empty degree name", async function () {
      await expect(
        registry.connect(school).issueDiploma(studentId, studentName, "", fieldOfStudy, ipfsHash)
      ).to.be.revertedWith("Degree name required");
    });

    it("Cannot issue the same degree to the same student twice", async function () {
      await registry.connect(school).issueDiploma(studentId, studentName, degreeName, fieldOfStudy, ipfsHash);
      await expect(
        registry.connect(school).issueDiploma(studentId, studentName, degreeName, fieldOfStudy, ipfsHash)
      ).to.be.revertedWith("Diploma already issued for this degree");
    });

    it("Student can have multiple diplomas with different degree names", async function () {
      await registry.connect(school).issueDiploma(studentId, studentName, "Bachelor's Degree", fieldOfStudy, ipfsHash);
      await registry.connect(school).issueDiploma(studentId, studentName, "Master's Degree", fieldOfStudy, ipfsHash);
      expect(await registry.getDiplomaCount(studentId)).to.equal(2);
    });
  });


  //  diploma getters


  describe("Getting Diplomas", function () {
    let certId;

    beforeEach(async function () {
      await registry.authorizeSchool(school.address, schoolName);
      const tx = await registry.connect(school).issueDiploma(
        studentId, studentName, degreeName, fieldOfStudy, ipfsHash
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "DiplomaIssued");
      certId = event.args.certId;
    });

    it("Can get diploma details by certId", async function () {
      const diploma = await registry.getDiploma(certId);
      expect(diploma.studentId).to.equal(studentId);
      expect(diploma.studentName).to.equal(studentName);
      expect(diploma.degreeName).to.equal(degreeName);
      expect(diploma.fieldOfStudy).to.equal(fieldOfStudy);
      expect(diploma.ipfsHash).to.equal(ipfsHash);
      expect(diploma.schoolName).to.equal(schoolName);
      expect(diploma.isRevoked).to.equal(false);
    });

    it("Can get all diploma IDs for a student", async function () {
      const diplomas = await registry.getStudentDiplomas(studentId);
      expect(diplomas.length).to.equal(1);
      expect(diplomas[0]).to.equal(certId);
    });

    it("Returns empty array for student with no diplomas", async function () {
      const diplomas = await registry.getStudentDiplomas("UNKNOWN999");
      expect(diplomas.length).to.equal(0);
    });

    it("Reverts when getting non-existent diploma", async function () {
      const fakeCertId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(registry.getDiploma(fakeCertId)).to.be.revertedWith("Diploma does not exist");
    });
  });


  //  testing diploma verification


  describe("Verification", function () {
    let certId;

    beforeEach(async function () {
      await registry.authorizeSchool(school.address, schoolName);
      const tx = await registry.connect(school).issueDiploma(
        studentId, studentName, degreeName, fieldOfStudy, ipfsHash
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "DiplomaIssued");
      certId = event.args.certId;
    });

    it("Valid diploma returns true", async function () {
      expect(await registry.verifyDiploma(certId)).to.equal(true);
    });

    it("Non-existent diploma returns false", async function () {
      const fakeCertId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      expect(await registry.verifyDiploma(fakeCertId)).to.equal(false);
    });
  });


  //  testing revocation 
  

  describe("Revocation", function () {
    let certId;

    beforeEach(async function () {
      await registry.authorizeSchool(school.address, schoolName);
      const tx = await registry.connect(school).issueDiploma(
        studentId, studentName, degreeName, fieldOfStudy, ipfsHash
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e?.name === "DiplomaIssued");
      certId = event.args.certId;
    });

    it("Issuing school can revoke a diploma", async function () {
      await registry.connect(school).revokeDiploma(certId);
      expect(await registry.verifyDiploma(certId)).to.equal(false);
    });

    it("Owner can revoke any diploma", async function () {
      await registry.revokeDiploma(certId);
      expect(await registry.verifyDiploma(certId)).to.equal(false);
    });

    it("Random user cannot revoke a diploma", async function () {
      await expect(
        registry.connect(randomUser).revokeDiploma(certId)
      ).to.be.revertedWith("Not authorized to revoke");
    });

    it("Cannot revoke an already revoked diploma", async function () {
      await registry.connect(school).revokeDiploma(certId);
      await expect(
        registry.connect(school).revokeDiploma(certId)
      ).to.be.revertedWith("Diploma already revoked");
    });

    it("Revoked diploma returns false on verify", async function () {
      await registry.connect(school).revokeDiploma(certId);
      expect(await registry.verifyDiploma(certId)).to.equal(false);
    });
  });


  // transfaring ownership
  

  describe("Transfer Ownership", function () {
    it("Owner can transfer ownership", async function () {
      await registry.transferOwnership(randomUser.address);
      expect(await registry.owner()).to.equal(randomUser.address);
    });

    it("Non-owner cannot transfer ownership", async function () {
      await expect(
        registry.connect(randomUser).transferOwnership(randomUser.address)
      ).to.be.revertedWith("Not the contract owner");
    });
  });
});
