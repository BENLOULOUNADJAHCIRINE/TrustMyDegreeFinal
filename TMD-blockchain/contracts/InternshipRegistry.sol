// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract InternshipRegistry {


    struct InternshipCertificate {
        // variables follow the same patterns as the previous contract , please refain to that for detailed explications ;
        bytes32 certId;          
        string  studentId;       
        string  studentName;     
        string  schoolName;      
        string  companyName;     
        string  internshipRole;  
        string  ipfsHash;        
        uint256 startDate;       
        uint256 endDate;         
        uint256 issueDate;       
        address issuedBy;       
        bool    isRevoked;
    }

   
    address public owner;

    mapping(bytes32 => InternshipCertificate) private certificates;
    mapping(string  => bytes32[])             private studentCertificates;
    mapping(address => bool)                  public  authorizedSchools;
    mapping(address => string)                public  schoolNames;
    mapping(string  => mapping(string => bool)) private alreadyIssued;

    uint256 private nonce;

    event SchoolAuthorized(address indexed school, string name);
    event SchoolRevoked(address indexed school);
    event InternshipIssued(bytes32 indexed certId, string studentId, address indexed school, string companyName);
    event InternshipRevoked(bytes32 indexed certId, address revokedBy);

    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    modifier onlyAuthorizedSchool() {
        require(authorizedSchools[msg.sender], "Not an authorized school");
        _;
    }

    modifier certExists(bytes32 certId) {
        require(certificates[certId].issueDate != 0, "Certificate does not exist");
        _;
    }

   
    constructor() {
        owner = msg.sender;
    }

    
    function authorizeSchool(address school, string calldata name) external onlyOwner {
        require(school != address(0), "Invalid address");
        require(!authorizedSchools[school], "School already authorized");
        authorizedSchools[school] = true;
        schoolNames[school] = name;
        emit SchoolAuthorized(school, name);
    }

    function revokeSchoolAuthorization(address school) external onlyOwner {
        require(authorizedSchools[school], "School is not authorized");
        authorizedSchools[school] = false;
        emit SchoolRevoked(school);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

   
    function issueInternship(
        string calldata studentId,
        string calldata studentName,
        string calldata companyName,
        string calldata internshipRole,
        string calldata ipfsHash,
        uint256         startDate,
        uint256         endDate
    ) external onlyAuthorizedSchool returns (bytes32 certId) {
        require(bytes(studentId).length > 0,      "Student ID required");
        require(bytes(studentName).length > 0,    "Student name required");
        require(bytes(companyName).length > 0,    "Company name required");
        require(bytes(internshipRole).length > 0, "Internship role required");
        require(endDate > startDate,              "End date must be after start date");
        require(!alreadyIssued[studentId][companyName], "Internship certificate already issued for this company");

        certId = keccak256(abi.encodePacked(studentId, msg.sender, block.timestamp, nonce));
        nonce++;

        certificates[certId] = InternshipCertificate({
            certId:         certId,
            studentId:      studentId,
            studentName:    studentName,
            schoolName:     schoolNames[msg.sender],
            companyName:    companyName,
            internshipRole: internshipRole,
            ipfsHash:       ipfsHash,
            startDate:      startDate,
            endDate:        endDate,
            issueDate:      block.timestamp,
            issuedBy:       msg.sender,
            isRevoked:      false
        });

        studentCertificates[studentId].push(certId);
        alreadyIssued[studentId][companyName] = true;

        emit InternshipIssued(certId, studentId, msg.sender, companyName);
    }

    function revokeCertificate(bytes32 certId) external certExists(certId) {
        InternshipCertificate storage c = certificates[certId];
        require(!c.isRevoked, "Certificate already revoked");
        require(msg.sender == owner || msg.sender == c.issuedBy, "Not authorized to revoke");
        c.isRevoked = true;
        emit InternshipRevoked(certId, msg.sender);
    }

    function getCertificate(bytes32 certId) external view certExists(certId) returns (InternshipCertificate memory) {
        return certificates[certId];
    }

    function getStudentCertificates(string calldata studentId) external view returns (bytes32[] memory) {
        return studentCertificates[studentId];
    }

    function verifyCertificate(bytes32 certId) external view returns (bool) {
        InternshipCertificate storage c = certificates[certId];
        if (c.issueDate == 0) return false;
        return !c.isRevoked;
    }

    function getCertificateCount(string calldata studentId) external view returns (uint256) {
        return studentCertificates[studentId].length;
    }
}
