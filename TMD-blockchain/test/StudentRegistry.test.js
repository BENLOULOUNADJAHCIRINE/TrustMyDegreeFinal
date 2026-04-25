const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Student Entity", function () {
    let contract;
    let admin;

    
    const sampleStudent = {
        rank: 1,
        matricule: 20210001,
        familyName: "Benloulous",
        name: "Cirine",
        credits: 30,
        average: "14.75",
        session: 0  // 0 = NORMAL, 1 = RATTRAPAGE
    };

    beforeEach(async function () {
        [admin] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory("TrustMyDegree");
        contract = await Contract.deploy();
        await contract.waitForDeployment();
    });

  
    it("should add a student correctly", async function () {
        await contract.addStudent(
            sampleStudent.rank,
            sampleStudent.matricule,
            sampleStudent.familyName,
            sampleStudent.name,
            sampleStudent.credits,
            sampleStudent.average,
            sampleStudent.session
        );

        const student = await contract.getStudent(sampleStudent.matricule);
        expect(student.rank).to.equal(sampleStudent.rank);
        expect(student.matricule).to.equal(sampleStudent.matricule);
        expect(student.familyName).to.equal(sampleStudent.familyName);
        expect(student.name).to.equal(sampleStudent.name);
        expect(student.credits).to.equal(sampleStudent.credits);
        expect(student.average).to.equal(sampleStudent.average);
        expect(student.session).to.equal(sampleStudent.session);
    });

    it("should increment studentCount after adding", async function () {
        await contract.addStudent(
            sampleStudent.rank, sampleStudent.matricule,
            sampleStudent.familyName, sampleStudent.name,
            sampleStudent.credits, sampleStudent.average,
            sampleStudent.session
        );
        expect(await contract.studentCount()).to.equal(1);
    });

    it("should emit StudentAdded event", async function () {
        await expect(
            contract.addStudent(
                sampleStudent.rank, sampleStudent.matricule,
                sampleStudent.familyName, sampleStudent.name,
                sampleStudent.credits, sampleStudent.average,
                sampleStudent.session
            )
        ).to.emit(contract, "StudentAdded")
         .withArgs(sampleStudent.matricule, sampleStudent.name, sampleStudent.familyName);
    });

    it("should reject duplicate matricule", async function () {
        await contract.addStudent(
            sampleStudent.rank, sampleStudent.matricule,
            sampleStudent.familyName, sampleStudent.name,
            sampleStudent.credits, sampleStudent.average,
            sampleStudent.session
        );
        await expect(
            contract.addStudent(
                sampleStudent.rank, sampleStudent.matricule,
                sampleStudent.familyName, sampleStudent.name,
                sampleStudent.credits, sampleStudent.average,
                sampleStudent.session
            )
        ).to.be.revertedWith("Student already exists");
    });

    it("should reject addStudent from non-admin", async function () {
        const [, nonAdmin] = await ethers.getSigners();
        await expect(
            contract.connect(nonAdmin).addStudent(
                sampleStudent.rank, sampleStudent.matricule,
                sampleStudent.familyName, sampleStudent.name,
                sampleStudent.credits, sampleStudent.average,
                sampleStudent.session
            )
        ).to.be.revertedWith("Not authorized");
    });

    
    it("should update a student correctly", async function () {
        await contract.addStudent(
            sampleStudent.rank, sampleStudent.matricule,
            sampleStudent.familyName, sampleStudent.name,
            sampleStudent.credits, sampleStudent.average,
            sampleStudent.session
        );

        await contract.updateStudent(
            sampleStudent.matricule,
            2, "UpdatedFamily", "UpdatedName", 60, "16.00", 1
        );

        const updated = await contract.getStudent(sampleStudent.matricule);
        expect(updated.rank).to.equal(2);
        expect(updated.familyName).to.equal("UpdatedFamily");
        expect(updated.name).to.equal("UpdatedName");
        expect(updated.credits).to.equal(60);
        expect(updated.average).to.equal("16.00");
        expect(updated.session).to.equal(1);
    });

    it("should emit StudentUpdated event", async function () {
        await contract.addStudent(
            sampleStudent.rank, sampleStudent.matricule,
            sampleStudent.familyName, sampleStudent.name,
            sampleStudent.credits, sampleStudent.average,
            sampleStudent.session
        );
        await expect(
            contract.updateStudent(
                sampleStudent.matricule,
                2, "UpdatedFamily", "UpdatedName", 60, "16.00", 1
            )
        ).to.emit(contract, "StudentUpdated")
         .withArgs(sampleStudent.matricule);
    });

    it("should revert update on non-existent student", async function () {
        await expect(
            contract.updateStudent(99999, 1, "X", "Y", 0, "0.00", 0)
        ).to.be.revertedWith("Student not found");
    });

    
    it("should delete a student correctly", async function () {
        await contract.addStudent(
            sampleStudent.rank, sampleStudent.matricule,
            sampleStudent.familyName, sampleStudent.name,
            sampleStudent.credits, sampleStudent.average,
            sampleStudent.session
        );

        await contract.deleteStudent(sampleStudent.matricule);
        expect(await contract.studentCount()).to.equal(0);

        await expect(
            contract.getStudent(sampleStudent.matricule)
        ).to.be.revertedWith("Student not found");
    });

    it("should emit StudentDeleted event", async function () {
        await contract.addStudent(
            sampleStudent.rank, sampleStudent.matricule,
            sampleStudent.familyName, sampleStudent.name,
            sampleStudent.credits, sampleStudent.average,
            sampleStudent.session
        );
        await expect(
            contract.deleteStudent(sampleStudent.matricule)
        ).to.emit(contract, "StudentDeleted")
         .withArgs(sampleStudent.matricule);
    });

    it("should revert delete on non-existent student", async function () {
        await expect(
            contract.deleteStudent(99999)
        ).to.be.revertedWith("Student not found");
    });

   
    it("should return all students", async function () {
        await contract.addStudent(
            1, 20210001, "Family1", "Name1", 30, "14.75", 0
        );
        await contract.addStudent(
            2, 20210002, "Family2", "Name2", 28, "12.50", 1
        );

        const all = await contract.getAllStudents();
        expect(all.length).to.equal(2);
    });

    it("should revert getStudent on non-existent matricule", async function () {
        await expect(
            contract.getStudent(99999)
        ).to.be.revertedWith("Student not found");
    });
});