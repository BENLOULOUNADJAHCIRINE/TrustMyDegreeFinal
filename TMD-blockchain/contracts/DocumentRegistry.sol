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

    mapping(bytes32 => Document)                        private documents;
    mapping(string  => bytes32[])                       private studentDocuments;
    mapping(address => bool)                            public  authorizedSchools;
    mapping(address => string)                          public  schoolNames;
    mapping(string  => mapping(string => bool))         private alreadyIssued; 

    uint256 private nonce;

    event SchoolAuthorized(address indexed school, string name);
    event DocumentIssued(bytes32 indexed docId, string studentId, string documentType);
    event DocumentRevoked(bytes32 indexed docId, address revokedBy);
    event DocumentUnrevoked(bytes32 indexed docId, address unrevokedBy);

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

        // Only block if there is an active (non-revoked) document of the same type
        require(
            !alreadyIssued[studentId][documentType] || _hasNoActiveDocument(studentId, documentType),
            "An active document of this type already exists"
        );

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
        alreadyIssued[studentId][documentType] = true;

        emit DocumentIssued(docId, studentId, documentType);
    }

   

    function revokeDocument(bytes32 docId) external docExists(docId) {
        Document storage d = documents[docId];
        require(!d.isRevoked, "Document already revoked");
        require(msg.sender == owner || msg.sender == d.issuedBy, "Not authorized");
        d.isRevoked = true;
        alreadyIssued[d.studentId][d.documentType] = false; 
        emit DocumentRevoked(docId, msg.sender);
    }

    function unrevokeDocument(bytes32 docId) external docExists(docId) {
        Document storage d = documents[docId];
        require(d.isRevoked, "Document is not revoked");
        require(msg.sender == owner || msg.sender == d.issuedBy, "Not authorized");
        d.isRevoked = false;
        alreadyIssued[d.studentId][d.documentType] = true; 
        emit DocumentUnrevoked(docId, msg.sender);
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

    function _hasNoActiveDocument(string calldata studentId, string calldata documentType) internal view returns (bool) {
        bytes32[] storage ids = studentDocuments[studentId];
        for (uint256 i = 0; i < ids.length; i++) {
            Document storage d = documents[ids[i]];
            if (
                keccak256(bytes(d.documentType)) == keccak256(bytes(documentType)) &&
                !d.isRevoked
            ) {
                return false;
            }
        }
        return true; 
    }
}
