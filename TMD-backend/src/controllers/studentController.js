const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

// Student Dashboard
const dashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    const student = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

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

    const lastIssuedCertificate = await prisma.certificate.findFirst({
      where: { studentId: userId },
      orderBy: { issueDate: "desc" },
    });

    const requests = await prisma.request.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      fullName: student.fullName,
      isGraduated: student.isGraduated,
      activeCertificates,
      totalCertificates,
      certificates,
      lastIssuedCertificate,
      requests,
    });
  } catch (err) {
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

// Student Create Request
const requests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { documentType, reason, delivery, priority } = req.body;

    if (!documentType || !reason || !delivery || !priority) {
      return res.status(400).json({ message: "All informations are required" });
    }

    const student = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await prisma.request.create({
      data: {
        studentId: userId,
        documentType,
        reason,
        delivery,
        priority,
      },
    });

    res.status(200).json({ message: "Request created successfully" });
  } catch (err) {
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

// Student Download Certificate
const downloadCertificate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id: id },
    });

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    if (certificate.studentId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!certificate.fileUrl) {
      return res.status(404).json({ message: "Certificate file not found" });
    }

    const filePath = path.resolve(certificate.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File does not exist on server" });
    }

    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

// Student Download Request Document
const downloadRequestDocument = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const request = await prisma.request.findUnique({
      where: { id: id },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.studentId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!request.fileUrl) {
      return res.status(404).json({ message: "Document not uploaded yet" });
    }

    const filePath = path.resolve(request.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File does not exist on server" });
    }

    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

// Student Change Password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;

    const student = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const identical = await bcrypt.compare(currentPassword, student.password);
    if (!identical) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect" });
    }

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