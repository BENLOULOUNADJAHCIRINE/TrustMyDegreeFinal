const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const sendEmail = require("../utils/sendEmail");
const XLSX = require("xlsx");
const generateDiplomaPDF = require("../utils/generatePDF");
const universityDB = require("../config/universityDB");
const path = require("path");
const fs = require("fs");

// main admin dashboard
const dashboard = async (req, res) => {
  try {
    const totalCertificates = await prisma.certificate.count();

    const activeCertificates = await prisma.certificate.count({
      where: { status: "ACTIVE" },
    });

    const revokedCertificates = await prisma.certificate.count({
      where: { status: "REVOKED" },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalVerifications = await prisma.verification.count({
      where: {
        verifiedAt: { gte: thirtyDaysAgo },
      },
    });

    const recentActivity = await prisma.certificate.findMany({
      take: 10,
      include: {
        student: true,
      },
      orderBy: {
        issueDate: "desc",
      },
    });
    res.status(200).json({
      totalCertificates,
      activeCertificates,
      revokedCertificates,
      totalVerifications,
      recentActivity,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "an error occured in the server" });
  }
};

// get all certificates for the list page
const getAllCertificates = async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: { student: true },
      orderBy: { issueDate: "desc" },
    });
    res.status(200).json({ certificates });
  } catch (err) {
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

// get all requests
const getRequests = async (req, res) => {
  try {
    const totalRequests = await prisma.request.count();
    const pendingRequests = await prisma.request.count({
      where: { status: "PENDING" },
    });
    const approvedRequests = await prisma.request.count({
      where: { status: "APPROVED" },
    });
    const rejectedRequests = await prisma.request.count({
      where: { status: "REJECTED" },
    });
    const fullList = await prisma.request.findMany({
      include: {
        student: true,
      },
    });
    res.status(200).json({
      requests: fullList, //
      summary: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "an error occured in the server" });
  }
};

// request approval or rejection
const handleRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;
    const findRequest = await prisma.request.findUnique({
      where: { id: id },
      include: { student: true },
    });
    if (!findRequest) {
      return res.status(400).json({ message: "request not found" });
    }
    if (status === "APPROVED") {
      await prisma.request.update({
        where: { id: id },
        data: { status: "APPROVED" },
      });
    } else {
      await prisma.request.update({
        where: { id: id },
        data: { status: "REJECTED" },
      });
    }
    res.status(200).json({ message: "Request status updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "an error occured in the server" });
  }
};

// request upload document
const handleRequestDocument = async (req, res) => {
  const id = req.params.id;
  try {
    const file = req.files.document;
    if (!file) {
      return res.status(400).json({ message: "no file uploaded" });
    }
    const findRequest = await prisma.request.findUnique({
      where: { id: id },
      include: { student: true },
    });
    if (!findRequest) {
      return res.status(400).json({ message: "request not found" });
    }
    const fileName = `${Date.now()}_${file.name}`;
    await file.mv(`./uploads/${fileName}`);
    await prisma.request.update({
      where: { id: id },
      data: { fileUrl: `uploads/${fileName}` },
    });
    if (findRequest.status === "APPROVED") {
      await sendEmail(
        findRequest.student.email,
        "Request Approved",
        `<h2>Hello ${findRequest.student.fullName}</h2>
        <p>Your request for <strong>${findRequest.documentType}</strong> has been approved.</p>
        <p>You can download your document from your dashboard.</p>
        <a href="http://localhost:3000/login" 
          style="
            display: inline-block;
            padding: 12px 24px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin-top: 16px;
          ">
          Login to Dashboard
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 16px;">
          If the button doesn't work, copy this link: http://localhost:3000/login
        </p>`,
      );
    } else {
      await sendEmail(
        findRequest.student.email,
        "Request Rejected",
        `<h2>Hello ${findRequest.student.fullName}</h2>
        <p>Your request for <strong>${findRequest.documentType}</strong> has been rejected.</p>
        <p>Please contact your university for more information.</p>
        <a href="http://localhost:3000/login" 
          style="
            display: inline-block;
            padding: 12px 24px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin-top: 16px;
          ">
          Login to Dashboard
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 16px;">
          If the button doesn't work, copy this link: http://localhost:3000/login
        </p>`,
      );
    }
    res.status(200).json({ message: "File uploaded succesfully" });
  } catch (err) {
    res.status(500).json({ error: "an error occured in the server" });
  }
};

// revoke Certificate
const revokeCertificate = async (req, res) => {
  try {
    const id = req.params.id;
    const exist = await prisma.certificate.findUnique({
      where: { id: id },
    });
    if (!exist) {
      return res.status(400).json({ message: "certificate not found" });
    }
    if (exist.status === "REVOKED") {
      return res.status(400).json({ message: "certificate already revoked" });
    }
    await prisma.certificate.update({
      where: { id: id },
      data: { status: "REVOKED" },
    });
    res.status(200).json({ message: "Certificate revoked succesfully" });
  } catch (err) {
    res.status(500).json({ error: "an error occured in the server" });
  }
};

// Change admin password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const student = await prisma.user.findUnique({
      where: { id: userId },
    });
    const { currentPassword, newPassword } = req.body;
    const identical = await bcrypt.compare(currentPassword, student.password);
    if (!identical) {
      return res.status(400).json({ message: "Current password is false" });
    }
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "an error occured in the server" });
  }
};

// sync students
const syncStudents = async (req, res) => {
  try {
    const result = await universityDB.query("SELECT * FROM students");
    const students = result.rows;
    if (students.length == 0) {
      return res
        .status(404)
        .json({ message: "no students found in university database" });
    }
    let created = 0;
    let skipped = 0;

    for (const student of students) {
      const exists = await prisma.user.findUnique({
        where: { matricule: student.matricule },
      });
      if (exists) {
        skipped++;
        continue;
      }

      const dateOfBirth = student.date_of_birth.toLocaleDateString("en-CA");
      const hashed = await bcrypt.hash(dateOfBirth, 10);
      await prisma.user.create({
        data: {
          fullName: student.full_name,
          matricule: student.matricule,
          password: hashed,
          role: "STUDENT",
          dateOfBirth: dateOfBirth,
          placeOfBirth: student.place_of_birth,
          isGraduated: student.is_graduated,
          email: student.email,
        },
      });
      created++;
    }
    res.json({
      message: "sync completed",
      created,
      skipped,
      total: students.length,
    });
  } catch (err) {
    console.error("sync error:", err);
    res.status(500).json({ message: "something went wrong" });
  }
};

// import diplomas from excel file
const importDiplomas = async (req, res) => {
  try {
    const { graduationDate } = req.body;
    const file = req.files.excel;

    if (!file) {
      return res.status(400).json({ message: "no file uploaded" });
    }
    if (!graduationDate) {
      return res.status(400).json({ message: "graduationDate is required" });
    }

    const workbook = XLSX.read(file.data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ message: "excel file is empty" });
    }

    let created = 0;
    const errors = [];

    for (const row of rows) {
      const student = await prisma.user.findUnique({
        where: { matricule: String(row.matricule) },
      });

      if (!student) {
        errors.push({ matricule: row.matricule, error: "student not found" });
        continue;
      }

      // ✅ NEW: prevent duplicate certificates for same student
      const existingCert = await prisma.certificate.findFirst({
        where: {
          studentId: student.id,
          specialty: row.specialty,
          type: row.type,
        },
      });

      if (existingCert) {
        errors.push({
          matricule: row.matricule,
          error: "certificate already exists",
        });
        continue;
      }

      const uniqueCode = `CERT-${student.matricule}-${Date.now()}`;

      const certificate = await prisma.certificate.create({
        data: {
          studentId: student.id,
          type: row.type,
          specialty: row.specialty,
          mention: row.mention,
          faculty: row.faculty,
          sectionNum: String(row.sectionNum),
          facultyNum: String(row.facultyNum),
          graduationDate: graduationDate,
          uniqueCode: uniqueCode,
          status: "ACTIVE",
        },
      });

      const pdfPath = await generateDiplomaPDF({
        fullName: student.fullName,
        specialty: row.specialty,
        faculty: row.faculty,
        sectionNum: String(row.sectionNum),
        facultyNum: String(row.facultyNum),
        mention: row.mention,
        graduationDate: graduationDate,
        issueDate: new Date().toISOString().split("T")[0],
        uniqueCode: uniqueCode,
      });

      await prisma.certificate.update({
        where: { id: certificate.id },
        data: { fileUrl: pdfPath },
      });

      await prisma.user.update({
        where: { id: student.id },
        data: { isGraduated: true },
      });

      await sendEmail(
        student.email,
        "Your Diploma is Ready 🎓",
        `<h2>Congratulations ${student.fullName}!</h2>
        <p>Your diploma is now available on your dashboard.</p>
        <a href="http://localhost:3000/login" 
          style="
            display: inline-block;
            padding: 12px 24px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin-top: 16px;
          ">
          Login to Dashboard
        </a>
        <p style="color: #888; font-size: 12px; margin-top: 16px;">
          If the button doesn't work, copy this link: http://localhost:3000/login
        </p>`,
      );

      created++;
    }

    res.status(200).json({
      message: "import completed",
      created,
      errors,
      total: rows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

// get statistics
const getStatistics = async (req, res) => {
  try {
    const totalMaster = await prisma.certificate.count({
      where: { type: "MASTER" },
    });
    const totalEngineer = await prisma.certificate.count({
      where: { type: "ENGINEER" },
    });
    const totalstages = await prisma.certificate.count({
      where: { type: "STAGE" },
    });
    const DistributionByType = {
      MASTER: totalMaster,
      ENGINEER: totalEngineer,
      STAGE: totalstages,
    };
    const topSpecialties = await prisma.certificate.groupBy({
      by: ["specialty"],
      _count: { specialty: true },
      orderBy: { _count: { specialty: "desc" } },
      take: 5,
    });
    const certificates = await prisma.certificate.findMany();
    const monthlyIssuance = {};
    certificates.forEach((cert) => {
      const month = new Date(cert.issueDate).toLocaleString("fr-FR", {
        month: "short",
      });
      if (monthlyIssuance[month]) {
        monthlyIssuance[month]++;
      } else {
        monthlyIssuance[month] = 1;
      }
    });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const verifications = await prisma.verification.findMany({
      where: { verifiedAt: { gte: thirtyDaysAgo } },
    });
    const verificationsPerDay = {};
    verifications.forEach((v) => {
      const day = new Date(v.verifiedAt).toISOString().split("T")[0];
      if (verificationsPerDay[day]) {
        verificationsPerDay[day]++;
      } else {
        verificationsPerDay[day] = 1;
      }
    });
    res.status(200).json({
      DistributionByType,
      topSpecialties,
      monthlyIssuance,
      verificationsPerDay,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};
// admin view/download certificate
const downloadCertificate = async (req, res) => {
  try {
    const id = req.params.id;
    const certificate = await prisma.certificate.findUnique({
      where: { id: id },
    });
    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
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

const exportCertificates = async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: { student: true },
      orderBy: { issueDate: "desc" },
    });

    const rows = certificates.map((cert) => ({
      "Student Name": cert.student?.fullName || "",
      Matricule: cert.student?.matricule || "",
      Type: cert.type || "",
      Specialty: cert.specialty || "",
      Mention: cert.mention || "",
      Faculty: cert.faculty || "",
      "Issue Date": new Date(cert.issueDate).toLocaleDateString("fr-FR"),
      Status: cert.status || "",
      "Unique Code": cert.uniqueCode || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Certificates");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=certificates.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};
module.exports = {
  changePassword,
  revokeCertificate,
  getRequests,
  dashboard,
  syncStudents,
  handleRequestStatus,
  handleRequestDocument,
  importDiplomas,
  getStatistics,
  getAllCertificates,
  downloadCertificate,
  exportCertificates,
};
