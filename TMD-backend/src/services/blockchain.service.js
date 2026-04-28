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

let noncePromise = null;

const getNonce = async () => {
  if (!noncePromise) {
    noncePromise = provider.getTransactionCount(signer.address, "pending");
  }

  const nonce = await noncePromise;
  noncePromise = Promise.resolve(nonce + 1);

  return nonce;
};

// Diploma struct fields: certId, studentId, studentName, schoolName,
// degreeName, fieldOfStudy, ipfsHash, issueDate, issuedBy, isRevoked
const issueDiploma = async ({ studentId, studentName, degreeName, fieldOfStudy, ipfsHash }) => {
  const nonce = await getNonce();
  const tx = await diplomaContract.issueDiploma(
    studentId,
    studentName,
    degreeName,
    fieldOfStudy,
    ipfsHash,
    { nonce }
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

  const nonce = await getNonce();
  const tx = await internshipContract.issueInternship(
    studentId,
    studentName,
    companyName,
    internshipRole,
    internshipCity,  // ← added
    ipfsHash,
    startTs,
    endTs,
    { nonce }
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
  const nonce = await getNonce();
  const tx = await studyContract.issueStudyCertificate(
    studentId,
    studentName,
    programName,
    academicYear,
    certificateType,
    ipfsHash,
    { nonce }
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
  const doc = await contract.getDocument(blockchainCertId);
  
  // also fetch student data to get rank and average
  let studentData = null;
  try {
    studentData = await contract.getStudent(doc.matricule);
  } catch (e) {
    console.warn("Could not fetch student rank data:", e.message);
  }

  return {
    matricule: doc.matricule.toString(),
    documentType: doc.documentType,
    description: doc.description,
    ipfsHash: doc.ipfsHash,
    issueDate: doc.issueDate.toString(),
    issuedBy: doc.issuedBy,
    isRevoked: doc.isRevoked,
    // student academic data
    rank: studentData?.rank?.toString() || "—",
    average: studentData?.average || "—",
    speciality: studentData?.speciality || "",
    year: studentData?.year || "",
    branch: studentData?.branch || "",
    session: studentData?.session === 0n ? "NORMAL" : "RATTRAPAGE",
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
  const nonce = await getNonce();

  let tx;
  if (contractType === "DIPLOMA") {
    tx = await contract.revokeDiploma(blockchainCertId, { nonce });
  } else if (contractType === "RANK") {
    tx = await contract.revokeDocument(blockchainCertId, { nonce });
  } else {
    tx = await contract.revokeCertificate(blockchainCertId, { nonce });
  }

  const receipt = await tx.wait();
  return receipt.hash;
};
const issueDocument = async ({ studentId, studentName, documentType, ipfsHash }) => {
  const nonce = await getNonce();
  const tx = await documentContract.issueDocument(
    studentId,
    studentName,
    documentType,
    ipfsHash,
    { nonce }
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
  const nonce = await getNonce();
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
    session === "RATTRAPAGE" ? 1 : 0,
    { nonce }
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

const issueRankDocument = async ({ matricule, documentType, description, ipfsHash }) => {
  const nonce = await getNonce();
  const tx = await rankRegistryContract.issueDocument(
    BigInt(matricule),
    documentType,
    description,
    ipfsHash,
    { nonce }
  );
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try { return rankRegistryContract.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e?.name === "DocumentIssued");

  if (!event) throw new Error("DocumentIssued event not found in RankRegistry");

  return {
    blockchainCertId: event.args.certId,
    txHash: receipt.hash,
  };
};

const unrevokeCertificate = async (contractType, blockchainCertId) => {
  const contract = getContract(contractType);
  const nonce = await getNonce();

  let tx;
  if (contractType === "DIPLOMA") {
    tx = await contract.unrevokeDiploma(blockchainCertId, { nonce });
  } else if (contractType === "RANK") {
    tx = await contract.unrevokeDocument(blockchainCertId, { nonce });
  } else {
    tx = await contract.unrevokeCertificate(blockchainCertId, { nonce });
  }

  const receipt = await tx.wait();
  return receipt.hash;
};

module.exports = {
  issueDiploma,
  issueInternship,
  issueStudyCertificate,
  issueRankDocument,
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