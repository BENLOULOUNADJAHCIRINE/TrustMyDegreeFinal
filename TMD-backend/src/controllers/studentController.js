const prisma = require("../config/prisma");
const axios = require("axios");
const bcrypt = require("bcrypt");
const { uploadAvatarToCloudinary } = require("../services/cloudinary.service");
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
            ipfsUrl: cert.ipfsHash ? `https://ipfs.filebase.io/ipfs/${cert.ipfsHash}` : null,
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

    const rawRequests = await prisma.request.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: "desc" },
    });

    const requests = rawRequests.map((req) => ({
      ...req,
      fileUrl: req.ipfsHash ? `https://ipfs.filebase.io/ipfs/${req.ipfsHash}` : req.fileUrl,
    }));

    res.status(200).json({
      fullName: student.fullName,
      matricule: student.matricule,
      email: student.email,
      dateOfBirth: student.dateOfBirth,
      placeOfBirth: student.placeOfBirth,
      isGraduated: student.isGraduated,
      avatar: student.avatar || null,
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

    // Auto-generate if not yet uploaded to Filebase
    if (!certificate.ipfsHash || certificate.ipfsHash === "pending") {
      if (!certificate.certData) {
        return res.status(404).json({ message: "Certificate data not available" });
      }
      const generateDiplomaPDF = require("../utils/generatePDF");
      const { uploadPDFtoPinata } = require("../services/pinata.service");
      const data = certificate.certData;
      const pdfPath = await generateDiplomaPDF(data, data.templateType || "diploma");
      const absolutePdfPath = require("path").resolve(pdfPath);
      const ipfsHash = await uploadPDFtoPinata(absolutePdfPath);
      require("fs").unlinkSync(absolutePdfPath);
      await prisma.certificate.update({ where: { id }, data: { ipfsHash } });
      certificate.ipfsHash = ipfsHash; // use it below
    }

    const ipfsUrl = `https://ipfs.filebase.io/ipfs/${certificate.ipfsHash}`;
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

    if (!request) return res.status(404).json({ message: "Document not found" });
    if (request.studentId !== userId) return res.status(403).json({ message: "Access denied" });
    if (!request.ipfsHash) return res.status(404).json({ message: "Document not available yet" });

    const ipfsUrl = `https://ipfs.filebase.io/ipfs/${request.ipfsHash}`;
    const response = await axios.get(ipfsUrl, { responseType: "stream" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="document_${id}.pdf"`);
    response.data.pipe(res);
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

const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.files || !req.files.avatar) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files.avatar;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ message: "Only JPEG, PNG, WebP, or GIF images are allowed" });
    }

    if (file.size > 3 * 1024 * 1024) {
      return res.status(400).json({ message: "Image must be under 3MB" });
    }

    const avatarUrl = await uploadAvatarToCloudinary(file.data, userId);

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    res.status(200).json({ message: "Avatar updated successfully", avatar: avatarUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "An error occurred on the server" });
  }
};

module.exports = {
  dashboard,
  requests,
  downloadCertificate,
  downloadRequestDocument,
  changePassword,
  uploadAvatar,
};