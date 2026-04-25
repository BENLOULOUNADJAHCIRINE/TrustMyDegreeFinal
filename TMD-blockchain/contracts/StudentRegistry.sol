// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract RankRegistry {

   
    enum Session { NORMAL, RATTRAPAGE }

    
    struct Student {
        uint256 matricule;
        string  name;
        string  familyName;
        string  speciality;    
        uint256 rank;
        string  average;      
        uint256 credits;
        Session session;
        bool    exists;
    }

    struct CustomDocument {
        bytes32 certId;          
        uint256 matricule;       
        string  documentType;    
        string  description;     
        string  ipfsHash;        
        uint256 issueDate;       
        address issuedBy;        
        bool    isRevoked;
    }

    
    address public owner;

    // Student data
    mapping(uint256 => Student) private students;
    uint256[] private matricules;
    uint256 public studentCount;

    // Document data
    mapping(bytes32 => CustomDocument) private documents;
    mapping(uint256 => bytes32[])      private studentDocuments;  // matricule => certIds

    // Access control
    mapping(address => bool)   public authorizedSchools;
    mapping(address => string) public schoolNames;

    mapping(uint256 => mapping(string => bool)) private alreadyIssued;

    uint256 private nonce;

    event SchoolAuthorized(address indexed school, string name);
    event SchoolRevoked(address indexed school);
    event StudentAdded(uint256 indexed matricule, string name, string familyName);
    event StudentUpdated(uint256 indexed matricule);
    event StudentDeleted(uint256 indexed matricule);
    event DocumentIssued(bytes32 indexed certId, uint256 indexed matricule, address indexed issuedBy, string documentType);
    event DocumentRevoked(bytes32 indexed certId, address revokedBy);
    event DocumentUnrevoked(bytes32 indexed certId, address unrevokedBy);

   

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    modifier onlyOwnerOrSchool() {
        require(msg.sender == owner || authorizedSchools[msg.sender], "Not authorized");
        _;
    }

    modifier studentExists(uint256 _matricule) {
        require(students[_matricule].exists, "Student not found");
        _;
    }

    modifier docExists(bytes32 certId) {
        require(documents[certId].issueDate != 0, "Document does not exist");
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

   
    function addStudent(
        uint256         _matricule,
        string calldata _name,
        string calldata _familyName,
        string calldata _speciality,
        uint256         _rank,
        string calldata _average,
        uint256         _credits,
        Session         _session
    ) external onlyOwnerOrSchool {
        require(_matricule != 0,              "Invalid matricule");
        require(!students[_matricule].exists, "Student already exists");

        students[_matricule] = Student({
            matricule:  _matricule,
            name:       _name,
            familyName: _familyName,
            speciality: _speciality,
            rank:       _rank,
            average:    _average,
            credits:    _credits,
            session:    _session,
            exists:     true
        });

        matricules.push(_matricule);
        studentCount++;

        emit StudentAdded(_matricule, _name, _familyName);
    }

    function updateStudent(
        uint256         _matricule,
        string calldata _name,
        string calldata _familyName,
        string calldata _speciality,
        uint256         _rank,
        string calldata _average,
        uint256         _credits,
        Session         _session
    ) external onlyOwnerOrSchool studentExists(_matricule) {
        Student storage s = students[_matricule];
        s.name       = _name;
        s.familyName = _familyName;
        s.speciality = _speciality;
        s.rank       = _rank;
        s.average    = _average;
        s.credits    = _credits;
        s.session    = _session;

        emit StudentUpdated(_matricule);
    }

    
    function deleteStudent(uint256 _matricule)
        external onlyOwnerOrSchool studentExists(_matricule)
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
//document stuff

    /// @param _matricule    Student's matricule (must exist)
    /// @param _documentType e.g. "English Medium", "Top Student", "Rank Certificate"
    /// @param _description  Custom description set by admin
    /// @param _ipfsHash     CID of the generated HTML document on IPFS
    function issueDocument(
        uint256         _matricule,
        string calldata _documentType,
        string calldata _description,
        string calldata _ipfsHash
    ) external onlyOwnerOrSchool studentExists(_matricule) returns (bytes32 certId) {
        require(bytes(_documentType).length > 0, "Document type required");
        require(!alreadyIssued[_matricule][_documentType], "Document already issued for this type");

        certId = keccak256(abi.encodePacked(_matricule, msg.sender, block.timestamp, nonce));
        nonce++;

        documents[certId] = CustomDocument({
            certId:       certId,
            matricule:    _matricule,
            documentType: _documentType,
            description:  _description,
            ipfsHash:     _ipfsHash,
            issueDate:    block.timestamp,
            issuedBy:     msg.sender,
            isRevoked:    false
        });

        studentDocuments[_matricule].push(certId);
        alreadyIssued[_matricule][_documentType] = true;

        emit DocumentIssued(certId, _matricule, msg.sender, _documentType);
    }

   //revoke doc
    function revokeDocument(bytes32 certId) external docExists(certId) {
        CustomDocument storage doc = documents[certId];
        require(!doc.isRevoked, "Document already revoked");
        require(msg.sender == owner || msg.sender == doc.issuedBy, "Not authorized to revoke");

        doc.isRevoked = true;
        alreadyIssued[doc.matricule][doc.documentType] = false;

        emit DocumentRevoked(certId, msg.sender);
    }

    //unrevoke stuff
    function unrevokeDocument(bytes32 certId) external docExists(certId) {
        CustomDocument storage doc = documents[certId];
        require(doc.isRevoked, "Document is not revoked");
        require(msg.sender == owner || msg.sender == doc.issuedBy, "Not authorized to unrevoke");

        doc.isRevoked = false;
        alreadyIssued[doc.matricule][doc.documentType] = true;

        emit DocumentUnrevoked(certId, msg.sender);
    }

    //getters for the student + document

    function getStudent(uint256 _matricule)
        external view studentExists(_matricule)
        returns (Student memory)
    {
        return students[_matricule];
    }

    function getAllStudents() external view returns (Student[] memory) {
        Student[] memory all = new Student[](matricules.length);
        for (uint256 i = 0; i < matricules.length; i++) {
            all[i] = students[matricules[i]];
        }
        return all;
    }

    function getStudentCount() external view returns (uint256) {
        return studentCount;
    }

    function getDocument(bytes32 certId)
        external view docExists(certId)
        returns (CustomDocument memory)
    {
        return documents[certId];
    }

    function getStudentDocuments(uint256 _matricule)
        external view returns (bytes32[] memory)
    {
        return studentDocuments[_matricule];
    }

    function verifyDocument(bytes32 certId) external view returns (bool) {
        CustomDocument storage doc = documents[certId];
        if (doc.issueDate == 0) return false;
        return !doc.isRevoked;
    }

    function getDocumentCount(uint256 _matricule) external view returns (uint256) {
        return studentDocuments[_matricule].length;
    }
}
