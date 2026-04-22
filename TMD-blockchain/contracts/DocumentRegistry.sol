// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentRegistry {

    struct Document {
        bytes32 docId;
        string  studentId;
        string  studentName;
        string  documentType;
        string  ipfsHash;
        uint256 issueDate;
        address issuedBy;
        bool    isRevoked;
    }

    address public owner;

    mapping(bytes32 => Document)   private documents;
    mapping(string  => bytes32[])  private studentDocuments;
    mapping(address => bool)       public  authorizedSchools;
    mapping(address => string)     public  schoolNames;

    uint256 private nonce;

    event SchoolAuthorized(address indexed school, string name);
    event DocumentIssued(bytes32 indexed docId, string studentId, string documentType);
    event DocumentRevoked(bytes32 indexed docId, address revokedBy);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    modifier onlyAuthorizedSchool() {
        require(authorizedSchools[msg.sender], "Not an authorized school");
        _;
    }

    modifier docExists(bytes32 docId) {
        require(documents[docId].issueDate != 0, "Document does not exist");
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

    function issueDocument(
        string calldata studentId,
        string calldata studentName,
        string calldata documentType,
        string calldata ipfsHash
    ) external onlyAuthorizedSchool returns (bytes32 docId) {
        require(bytes(studentId).length > 0,     "Student ID required");
        require(bytes(studentName).length > 0,   "Student name required");
        require(bytes(documentType).length > 0,  "Document type required");
        require(bytes(ipfsHash).length > 0,      "IPFS hash required");

        docId = keccak256(abi.encodePacked(studentId, documentType, block.timestamp, nonce));
        nonce++;

        documents[docId] = Document({
            docId:        docId,
            studentId:    studentId,
            studentName:  studentName,
            documentType: documentType,
            ipfsHash:     ipfsHash,
            issueDate:    block.timestamp,
            issuedBy:     msg.sender,
            isRevoked:    false
        });

        studentDocuments[studentId].push(docId);
        emit DocumentIssued(docId, studentId, documentType);
    }

    function revokeDocument(bytes32 docId) external docExists(docId) {
        Document storage d = documents[docId];
        require(!d.isRevoked, "Document already revoked");
        require(msg.sender == owner || msg.sender == d.issuedBy, "Not authorized");
        d.isRevoked = true;
        emit DocumentRevoked(docId, msg.sender);
    }

    function getDocument(bytes32 docId) external view docExists(docId) returns (Document memory) {
        return documents[docId];
    }

    function getStudentDocuments(string calldata studentId) external view returns (bytes32[] memory) {
        return studentDocuments[studentId];
    }

    function verifyDocument(bytes32 docId) external view returns (bool) {
        Document storage d = documents[docId];
        if (d.issueDate == 0) return false;
        return !d.isRevoked;
    }
}