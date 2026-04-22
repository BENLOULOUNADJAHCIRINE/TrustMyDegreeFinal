const prisma = require("../config/prisma");
const axios = require("axios");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const { getCertificateData } = require("../services/blockchain.service");

const dashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const student = await prisma.user.findUnique({ where: { id: userId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const activeCertificates = await prisma.certificate.count({
      where: { studentId: userId, status: "ACTIVE" },
    });

    const totalCertificates = await prisma.certificate.count({
      where: { studentId: userId },
    });

    const certificates = await prisma.certificate.findMany({
      where: { studentId: userId },
      orderBy: { issueDate: "desc" },
    });

    // fetch academic data from blockchain for each certificate
    // if blockchain call fails for one cert, we still return it without chainData
    const certificatesWithChainData = await Promise.all(
      certificates.map(async (cert) => {
        try {
          const chainData = await getCertificateData(cert.contractType, cert.blockchainCertId);
          const graduationDate = new Date(Number(chainData.issueDate) * 1000).toISOString();
          return {
            id: cert.id,
            uniqueCode: cert.uniqueCode,
            ipfsHash: cert.ipfsHash,
            ipfsUrl: `https://gateway.pinata.cloud/ipfs/${cert.ipfsHash}`,
            status: cert.status,
            issueDate: cert.issueDate,
            graduationDate,
            contractType: cert.contractType,
            type: cert.type,
            specialty: cert.specialty,
            chainData,
};
        } catch {
          return {
            id: cert.id,
            uniqueCode: cert.uniqueCode,
            ipfsHash: cert.ipfsHash,
            status: cert.status,
            issueDate: cert.issueDate,
            graduationDate: cert.issueDate,
            contractType: cert.contractType,
            type: cert.type,
            specialty: cert.specialty,
            chainData: null,
          };
        }
      })
    );

    const requests = await prisma.request.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      fullName: student.fullName,
      matricule: student.matricule,
      email: student.email,
      dateOfBirth: student.dateOfBirth,
      placeOfBirth: student.placeOfBirth,
      isGraduated: student.isGraduated,
      activeCertificates,
      totalCertificates,
      certificates: certificatesWithChainData,
      lastIssuedCertificate: certificatesWithChainData[0] || null,
      requests,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

const requests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { documentType, reason, delivery, priority } = req.body;

    if (!documentType || !reason || !delivery || !priority) {
      return res.status(400).json({ message: "All informations are required" });
    }

    const student = await prisma.user.findUnique({ where: { id: userId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    await prisma.request.create({
      data: { studentId: userId, documentType, reason, delivery, priority },
    });

    res.status(200).json({ message: "Request created successfully" });
  } catch (err) {
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

const downloadCertificate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const certificate = await prisma.certificate.findUnique({ where: { id } });

    if (!certificate) return res.status(404).json({ message: "Certificate not found" });
    if (certificate.studentId !== userId) return res.status(403).json({ message: "Access denied" });
    if (!certificate.ipfsHash) return res.status(404).json({ message: "Certificate file not found" });

    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${certificate.ipfsHash}`;
    const response = await axios.get(ipfsUrl, { responseType: "stream" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="certificate_${id}.pdf"`);
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

const downloadRequestDocument = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const request = await prisma.request.findUnique({ where: { id } });

    if (!request || !request.fileUrl) return res.status(404).json({ message: "Document not found" });
    if (request.studentId !== userId) return res.status(403).json({ message: "Access denied" });

    const fileName = path.basename(request.fileUrl);
    const filePath = path.join(process.cwd(), "uploads", fileName);

    if (fs.existsSync(filePath)) {
      return res.download(filePath);
    } else {
      return res.status(404).json({ message: "File does not exist on server" });
    }
  } catch (err) {
    res.status(500).json({ error: "An error occurred on the server" });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const student = await prisma.user.findUnique({ where: { id: userId } });

    if (!student) return res.status(404).json({ message: "Student not found" });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const identical = await bcrypt.compare(currentPassword, student.password);
    if (!identical) return res.status(400).json({ message: "Current password is incorrect" });

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

module.exports = {
  dashboard,
  requests,
  downloadCertificate,
  downloadRequestDocument,
  changePassword,
};