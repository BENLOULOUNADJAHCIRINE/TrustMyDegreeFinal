const { ethers } = require("ethers");
const DiplomaABI = require("../config/abis/DiplomaRegistry.json");
const InternshipABI = require("../config/abis/InternshipRegistry.json");
const StudyABI = require("../config/abis/StudyCertificateRegistry.json");
const DocumentABI = require("../config/abis/DocumentRegistry.json");
const RankRegistryABI = require("../config/abis/RankRegistry.json");

const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
const signer = new ethers.Wallet(process.env.SCHOOL_WALLET_PRIVATE_KEY, provider);

const diplomaContract = new ethers.Contract(
  process.env.DIPLOMA_CONTRACT_ADDRESS,
  DiplomaABI.abi,
  signer
);

const internshipContract = new ethers.Contract(
  process.env.INTERNSHIP_CONTRACT_ADDRESS,
  InternshipABI.abi,
  signer
);

const studyContract = new ethers.Contract(
  process.env.STUDY_CONTRACT_ADDRESS,
  StudyABI.abi,
  signer
);

const documentContract = new ethers.Contract(
  process.env.DOCUMENT_CONTRACT_ADDRESS,
  DocumentABI.abi,
  signer
);

const rankRegistryContract = new ethers.Contract(
  process.env.RANK_REGISTRY_ADDRESS,
  RankRegistryABI.abi,
  signer
);

const getContract = (contractType) => {
  if (contractType === "DIPLOMA") return diplomaContract;
  if (contractType === "INTERNSHIP") return internshipContract;
  if (contractType === "STUDY") return studyContract;
  if (contractType === "RANK") return rankRegistryContract;
  throw new Error(`Unknown contract type: ${contractType}`);
};

// Diploma struct fields: certId, studentId, studentName, schoolName,
// degreeName, fieldOfStudy, ipfsHash, issueDate, issuedBy, isRevoked
const issueDiploma = async ({ studentId, studentName, degreeName, fieldOfStudy, ipfsHash }) => {
  const tx = await diplomaContract.issueDiploma(
    studentId,
    studentName,
    degreeName,
    fieldOfStudy,
    ipfsHash
  );

  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try { return diplomaContract.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e?.name === "DiplomaIssued");
  return {
    blockchainCertId: event.args.certId,
    txHash: receipt.hash,
  };
};

// InternshipCertificate struct fields: certId, studentId, studentName, schoolName,
// companyName, internshipRole, ipfsHash, startDate, endDate, issueDate, issuedBy, isRevoked
const issueInternship = async ({ studentId, studentName, companyName, internshipRole, internshipCity, ipfsHash, startDate, endDate }) => {
  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  const endTs = Math.floor(new Date(endDate).getTime() / 1000);

  if (endTs <= startTs) {
    throw new Error("Internship end date must be strictly after start date");
  }

  const tx = await internshipContract.issueInternship(
    studentId,
    studentName,
    companyName,
    internshipRole,
    internshipCity,  // ← added
    ipfsHash,
    startTs,
    endTs
  );

  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try { return internshipContract.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e?.name === "InternshipIssued");

  return {
    blockchainCertId: event.args.certId,
    txHash: receipt.hash,
  };
};

// StudyCertificate struct fields: certId, studentId, studentName, schoolName,
// programName, academicYear, certificateType, ipfsHash, issueDate, issuedBy, isRevoked
const issueStudyCertificate = async ({ studentId, studentName, programName, academicYear, certificateType, ipfsHash }) => {
  const tx = await studyContract.issueStudyCertificate(
    studentId,
    studentName,
    programName,
    academicYear,
    certificateType,
    ipfsHash
  );

  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try { return studyContract.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e?.name === "StudyCertificateIssued");

  return {
    blockchainCertId: event.args.certId,
    txHash: receipt.hash,
  };
};

// verifyDiploma returns bool (false if not found or revoked)
// verifyCertificate on internship/study also returns bool
const verifyCertificate = async (contractType, blockchainCertId) => {
  const contract = getContract(contractType);
  if (contractType === "DIPLOMA") return await contract.verifyDiploma(blockchainCertId);
  if (contractType === "RANK") return await contract.verifyDocument(blockchainCertId);
  return await contract.verifyCertificate(blockchainCertId);
};

const getCertificateData = async (contractType, blockchainCertId) => {
  const contract = getContract(contractType);

  if (contractType === "DIPLOMA") {
    const data = await contract.getDiploma(blockchainCertId);
    return {
      certId: data.certId,
      studentId: data.studentId,
      studentName: data.studentName,
      schoolName: data.schoolName,
      degreeName: data.degreeName,
      fieldOfStudy: data.fieldOfStudy,
      ipfsHash: data.ipfsHash,
      issueDate: data.issueDate.toString(),
      issuedBy: data.issuedBy,
      isRevoked: data.isRevoked,
    };
  }
  if (contractType === "INTERNSHIP") {
    const data = await contract.getCertificate(blockchainCertId);
    return {
      certId: data.certId,
      studentId: data.studentId,
      studentName: data.studentName,
      schoolName: data.schoolName,
      companyName: data.companyName,
      internshipRole: data.internshipRole,
      internshipCity: data.internshipCity,  // ← added
      ipfsHash: data.ipfsHash,
      startDate: data.startDate.toString(),
      endDate: data.endDate.toString(),
      issueDate: data.issueDate.toString(),
      issuedBy: data.issuedBy,
      isRevoked: data.isRevoked,
    };
  }
  if (contractType === "RANK") {
  const data = await contract.getDocument(blockchainCertId);
  return {
    matricule: data.matricule.toString(),
    documentType: data.documentType,
    description: data.description,
    ipfsHash: data.ipfsHash,
    issueDate: data.issueDate.toString(),
    issuedBy: data.issuedBy,
    isRevoked: data.isRevoked,
  };
}

  const data = await contract.getCertificate(blockchainCertId);
  return {
    certId: data.certId,
    studentId: data.studentId,
    studentName: data.studentName,
    schoolName: data.schoolName,
    programName: data.programName,
    academicYear: data.academicYear,
    certificateType: data.certificateType,
    ipfsHash: data.ipfsHash,
    issueDate: data.issueDate.toString(),
    issuedBy: data.issuedBy,
    isRevoked: data.isRevoked,
  };
};

const revokeCertificate = async (contractType, blockchainCertId) => {
  const contract = getContract(contractType);

  let tx;
  if (contractType === "DIPLOMA") {
    tx = await contract.revokeDiploma(blockchainCertId);
  } else {
    tx = await contract.revokeCertificate(blockchainCertId);
  }

  const receipt = await tx.wait();
  return receipt.hash;
};

const issueDocument = async ({ studentId, studentName, documentType, ipfsHash }) => {
  const tx = await documentContract.issueDocument(
    studentId,
    studentName,
    documentType,
    ipfsHash
  );
  const receipt = await tx.wait();

  // log all events to see what's actually being emitted
  const parsedLogs = receipt.logs.map((log) => {
    try { return documentContract.interface.parseLog(log); } catch { return null; }
  }).filter(Boolean);

  console.log("DocumentRegistry events:", parsedLogs.map(e => e.name));

  const event = parsedLogs.find((e) => e?.name === "DocumentIssued");

  if (!event) {
    throw new Error(`DocumentIssued event not found. Events found: ${parsedLogs.map(e => e.name).join(", ")}`);
  }

  return {
    blockchainDocId: event.args.docId,
    txHash: receipt.hash,
  };
};

const verifyDocument = async (blockchainDocId) => {
  return await documentContract.verifyDocument(blockchainDocId);
};

const getDocumentData = async (blockchainDocId) => {
  const data = await documentContract.getDocument(blockchainDocId);
  return {
    docId: data.docId,
    studentId: data.studentId,
    studentName: data.studentName,
    documentType: data.documentType,
    ipfsHash: data.ipfsHash,
    issueDate: data.issueDate.toString(),
    issuedBy: data.issuedBy,
    isRevoked: data.isRevoked,
  };
};

// add student academic record to RankRegistry
const addStudentToRankRegistry = async ({ matricule, name, familyName, speciality, branch, year, rank, average, credits, session }) => {
  const tx = await rankRegistryContract.addStudent(
    BigInt(matricule),
    name,
    familyName,
    speciality,
    branch,
    year,
    BigInt(rank),
    String(average),
    BigInt(credits),
    session === "RATTRAPAGE" ? 1 : 0
  );
  const receipt = await tx.wait();
  return receipt.hash;
};

// get one student from RankRegistry
const getStudentFromRankRegistry = async (matricule) => {
  const data = await rankRegistryContract.getStudent(BigInt(matricule));
  return {
    matricule: data.matricule.toString(),
    name: data.name,
    familyName: data.familyName,
    speciality: data.speciality,
    branch : data.branch,
    year : data.year,
    rank: data.rank.toString(),
    average: data.average,
    credits: data.credits.toString(),
    session: data.session === 0n ? "NORMAL" : "RATTRAPAGE",
  };
};

// get all students from RankRegistry
const getAllStudentsFromRankRegistry = async () => {
  const all = await rankRegistryContract.getAllStudents();
  return all.map((data) => ({
    matricule: data.matricule.toString(),
    name: data.name,
    familyName: data.familyName,
    speciality: data.speciality,
    branch : data.branch,
    year : data.year,
    rank: data.rank.toString(),
    average: data.average,
    credits: data.credits.toString(),
    session: data.session === 0n ? "NORMAL" : "RATTRAPAGE",
  }));
};

const unrevokeCertificate = async (contractType, blockchainCertId) => {
  const contract = getContract(contractType);
  let tx;

  if (contractType === "DIPLOMA") {
    tx = await contract.unrevokeDiploma(blockchainCertId);
  } else if (contractType === "RANK") {
    tx = await contract.unrevokeDocument(blockchainCertId);
  } else {
    tx = await contract.unrevokeCertificate(blockchainCertId);
  }

  const receipt = await tx.wait();
  return receipt.hash;
};

module.exports = {
  issueDiploma,
  issueInternship,
  issueStudyCertificate,
  verifyCertificate,
  getCertificateData,
  revokeCertificate,
  unrevokeCertificate,
  issueDocument,
  verifyDocument,
  getDocumentData,
  addStudentToRankRegistry,
  getStudentFromRankRegistry,
  getAllStudentsFromRankRegistry,
};