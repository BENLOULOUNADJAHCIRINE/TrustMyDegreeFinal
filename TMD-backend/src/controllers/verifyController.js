const prisma = require("../config/prisma");
const { verifyCertificate, getCertificateData } = require("../services/blockchain.service");

const verifyCertificateHandler = async (req, res) => {
  try {
    const { uniqueCode } = req.params;

    // find the cert in Prisma to get the blockchain reference
    const certificate = await prisma.certificate.findUnique({
      where: { uniqueCode },
      include: {
        student: {
          select: {
            fullName: true,
            matricule: true,
            placeOfBirth: true,
            dateOfBirth: true,
          },
        },
      },
    });

    if (!certificate) {
      return res.status(404).json({ valid: false, message: "Certificate not found" });
    }

    // verify on-chain — blockchain is the source of truth
    const isValidOnChain = await verifyCertificate(
      certificate.contractType,
      certificate.blockchainCertId
    );

    if (!isValidOnChain) {
      return res.status(400).json({ valid: false, message: "Certificate is not valid on the blockchain" });
    }

    // fetch full academic data from the blockchain
    const chainData = await getCertificateData(
      certificate.contractType,
      certificate.blockchainCertId
    );

    // log the verification for statistics
    await prisma.verification.create({
      data: {
        certificateId: certificate.id,
        ipAddress: req.ip,
      },
    });

    // build academic data based on which contract type it is
    // each contract has different fields so we handle them separately
    const academicData = {
      studentName: chainData.studentName,
      schoolName: chainData.schoolName,
      issueDate: chainData.issueDate,
    };

    if (certificate.contractType === "DIPLOMA") {
      academicData.degreeName = chainData.degreeName;
      academicData.fieldOfStudy = chainData.fieldOfStudy;
    } else if (certificate.contractType === "INTERNSHIP") {
      academicData.companyName = chainData.companyName;
      academicData.internshipRole = chainData.internshipRole;
      academicData.startDate = chainData.startDate;
      academicData.endDate = chainData.endDate;
    } else if (certificate.contractType === "STUDY") {
      academicData.programName = chainData.programName;
      academicData.academicYear = chainData.academicYear;
      academicData.certificateType = chainData.certificateType;
    } else if (certificate.contractType === "RANK") {
      academicData.rank = chainData.rank;
      academicData.average = chainData.average;
      academicData.speciality = chainData.speciality;
      academicData.year = chainData.year;
      academicData.branch = chainData.branch;
      academicData.session = chainData.session;
    }

    res.json({
      valid: true,
      message: "Certificate is valid",
      certificate: {
        uniqueCode: certificate.uniqueCode,
        ipfsHash: certificate.ipfsHash,
        ipfsUrl: certificate.ipfsHash ? `https://ipfs.filebase.io/ipfs/${certificate.ipfsHash}` : null,
        status: certificate.status,
        issueDate: certificate.issueDate,
        contractType: certificate.contractType,
        student: certificate.student,
        academicData,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

module.exports = { verifyCertificate: verifyCertificateHandler };