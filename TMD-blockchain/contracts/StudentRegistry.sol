// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TrustMyDegree {

   
    enum Session { NORMAL, RATTRAPAGE }
    struct Student {
        uint256 rank;
        uint256 matricule;
        string  familyName;
        string  name;
        uint256 credits;
        string  average;
        Session session;
    }

   
    address public admin;
    mapping(uint256 => Student) private students;
    uint256[] private matricules;
    uint256 public studentCount;

   
    event StudentAdded(uint256 indexed matricule, string name, string familyName);
    event StudentUpdated(uint256 indexed matricule);
    event StudentDeleted(uint256 indexed matricule);

    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    modifier studentExists(uint256 _matricule) {
        require(students[_matricule].matricule != 0, "Student not found");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }



    function addStudent(
        uint256 _rank,
        uint256 _matricule,
        string memory _familyName,
        string memory _name,
        uint256 _credits,
        string memory _average,
        Session _session
    ) public onlyAdmin {
        require(students[_matricule].matricule == 0, "Student already exists");

        students[_matricule] = Student(
            _rank, _matricule, _familyName, _name,
            _credits, _average, _session
        );
        matricules.push(_matricule);
        studentCount++;

        emit StudentAdded(_matricule, _name, _familyName);
    }

    function updateStudent(
        uint256 _matricule,
        uint256 _rank,
        string memory _familyName,
        string memory _name,
        uint256 _credits,
        string memory _average,
        Session _session
    ) public onlyAdmin studentExists(_matricule) {
        Student storage s = students[_matricule];
        s.rank       = _rank;
        s.familyName = _familyName;
        s.name       = _name;
        s.credits    = _credits;
        s.average    = _average;
        s.session    = _session;

        emit StudentUpdated(_matricule);
    }

    function deleteStudent(uint256 _matricule)
        public onlyAdmin studentExists(_matricule)
    {
        delete students[_matricule];

        
        for (uint256 i = 0; i < matricules.length; i++) {
            if (matricules[i] == _matricule) {
                matricules[i] = matricules[matricules.length - 1];
                matricules.pop();
                break;
            }
        }
        studentCount--;

        emit StudentDeleted(_matricule);
    }

    
    function getStudent(uint256 _matricule)
        public view studentExists(_matricule)
        returns (Student memory)
    {
        return students[_matricule];
    }

    function getAllStudents() public view returns (Student[] memory) {
        Student[] memory all = new Student[](matricules.length);
        for (uint256 i = 0; i < matricules.length; i++) {
            all[i] = students[matricules[i]];
        }
        return all;
    }

    function getStudentCount() public view returns (uint256) {
        return studentCount;
    }
}