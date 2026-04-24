// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract StudyCertificateRegistry {

   
    struct StudyCertificate {
        bytes32 certId;            
        string  studentId;         
        string  studentName;       
        string  schoolName;        
        string  programName;       
        string  academicYear;      
        string  certificateType;  //year complited , year being taken or idk en cours ..
        string  ipfsHash;          
        uint256 issueDate;         
        address issuedBy;          
        bool    isRevoked;
    }

    address public owner;

    mapping(bytes32 => StudyCertificate)                private certificates;
    mapping(string  => bytes32[])                        private studentCertificates;
    mapping(address => bool)                             public  authorizedSchools;
    mapping(address => string)                           public  schoolNames;
    mapping(string  => mapping(string => bool))          private alreadyIssued;

    uint256 private nonce;

  
    event SchoolAuthorized(address indexed school, string name);
    event SchoolRevoked(address indexed school);
    event StudyCertificateIssued(bytes32 indexed certId, string studentId, address indexed school, string academicYear);
    event StudyCertificateRevoked(bytes32 indexed certId, address revokedBy);
    event StudyCertificateUnrevoked(bytes32 indexed certId, address unrevokedBy);

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

    

    function issueStudyCertificate(
        string calldata studentId,
        string calldata studentName,
        string calldata programName,
        string calldata academicYear,
        string calldata certificateType,
        string calldata ipfsHash
    ) external onlyAuthorizedSchool returns (bytes32 certId) {
        require(bytes(studentId).length > 0,       "Student ID required");
        require(bytes(studentName).length > 0,     "Student name required");
        require(bytes(programName).length > 0,     "Program name required");
        require(bytes(academicYear).length > 0,    "Academic year required");
        require(bytes(certificateType).length > 0, "Certificate type required");

        string memory key = string(abi.encodePacked(academicYear, certificateType));

        // Only block if there is an active (non-revoked) cert for the same year + type
        require(
            !alreadyIssued[studentId][key] || _hasNoActiveCertificate(studentId, academicYear, certificateType),
            "An active certificate already exists for this year and type"
        );

        certId = keccak256(abi.encodePacked(studentId, msg.sender, block.timestamp, nonce));
        nonce++;

        certificates[certId] = StudyCertificate({
            certId:          certId,
            studentId:       studentId,
            studentName:     studentName,
            schoolName:      schoolNames[msg.sender],
            programName:     programName,
            academicYear:    academicYear,
            certificateType: certificateType,
            ipfsHash:        ipfsHash,
            issueDate:       block.timestamp,
            issuedBy:        msg.sender,
            isRevoked:       false
        });

        studentCertificates[studentId].push(certId);
        alreadyIssued[studentId][key] = true;

        emit StudyCertificateIssued(certId, studentId, msg.sender, academicYear);
    }

   

    function revokeCertificate(bytes32 certId) external certExists(certId) {
        StudyCertificate storage c = certificates[certId];
        require(!c.isRevoked, "Certificate already revoked");
        require(msg.sender == owner || msg.sender == c.issuedBy, "Not authorized to revoke");
        c.isRevoked = true;
        alreadyIssued[c.studentId][string(abi.encodePacked(c.academicYear, c.certificateType))] = false; // allow reissue after revoke
        emit StudyCertificateRevoked(certId, msg.sender);
    }

    function unrevokeCertificate(bytes32 certId) external certExists(certId) {
        StudyCertificate storage c = certificates[certId];
        require(c.isRevoked, "Certificate is not revoked");
        require(msg.sender == owner || msg.sender == c.issuedBy, "Not authorized to unrevoke");
        c.isRevoked = false;
        alreadyIssued[c.studentId][string(abi.encodePacked(c.academicYear, c.certificateType))] = true; // re-lock duplicate check
        emit StudyCertificateUnrevoked(certId, msg.sender);
    }

    
    function getCertificate(bytes32 certId) external view certExists(certId) returns (StudyCertificate memory) {
        return certificates[certId];
    }

    function getStudentCertificates(string calldata studentId) external view returns (bytes32[] memory) {
        return studentCertificates[studentId];
    }

    function verifyCertificate(bytes32 certId) external view returns (bool) {
        StudyCertificate storage c = certificates[certId];
        if (c.issueDate == 0) return false;
        return !c.isRevoked;
    }

    function getCertificateCount(string calldata studentId) external view returns (uint256) {
        return studentCertificates[studentId].length;
    }

    

    // Returns true if all existing certs for this year + type are revoked (safe to reissue)
    function _hasNoActiveCertificate(
        string calldata studentId,
        string calldata academicYear,
        string calldata certificateType
    ) internal view returns (bool) {
        bytes32[] storage ids = studentCertificates[studentId];
        string memory key = string(abi.encodePacked(academicYear, certificateType));
        for (uint256 i = 0; i < ids.length; i++) {
            StudyCertificate storage c = certificates[ids[i]];
            if (
                keccak256(bytes(string(abi.encodePacked(c.academicYear, c.certificateType)))) == keccak256(bytes(key)) &&
                !c.isRevoked
            ) {
                return false; // found an active one → block reissue
            }
        }
        return true; // all revoked → allow reissue
    }
}
