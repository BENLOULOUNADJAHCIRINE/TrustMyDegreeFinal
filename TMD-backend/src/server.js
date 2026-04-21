const express = require("express");
const cors = require("cors");
const path = require("path");
const fileUpload = require("express-fileupload");
const prisma = require("./config/prisma");
const { verifyCertificate, getCertificateData } = require("./services/blockchain.service");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));

// routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/student", require("./routes/student"));
app.use("/api/verify", require("./routes/verify"));
app.use("/api/contact", require("./routes/contact"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TrustMyDegree API is running" });
});

app.post("/verify", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ valid: false, message: "Code is required" });

  try {
    const { verifyCertificate } = require("./services/blockchain.service");
    const prisma = require("./config/prisma");

    const certificate = await prisma.certificate.findUnique({
      where: { uniqueCode: code },
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

    const isValidOnChain = await verifyCertificate(
      certificate.contractType,
      certificate.blockchainCertId
    );

    if (!isValidOnChain) {
      return res.status(400).json({ valid: false, message: "Certificate has been revoked" });
    }

    await prisma.verification.create({
      data: { certificateId: certificate.id, ipAddress: req.ip },
    });

    const chainData = await getCertificateData(
    certificate.contractType,
    certificate.blockchainCertId
  );

  const academicData = {
    studentName: chainData.studentName,
    schoolName: chainData.schoolName,
    issueDate: chainData.issueDate,
  };

  if (certificate.contractType === "INTERNSHIP") {
    academicData.companyName = chainData.companyName;
    academicData.internshipRole = chainData.internshipRole;
    academicData.startDate = chainData.startDate;
    academicData.endDate = chainData.endDate;
  } else if (certificate.contractType === "STUDY") {
    academicData.programName = chainData.programName;
    academicData.academicYear = chainData.academicYear;
    academicData.certificateType = chainData.certificateType;
  } else {
    academicData.degreeName = chainData.degreeName;
    academicData.fieldOfStudy = chainData.fieldOfStudy;
  }

  res.json({
    valid: true,
    message: "Certificate is valid",
    certificate: {
      uniqueCode: certificate.uniqueCode,
      type: certificate.type,
      specialty: certificate.specialty,
      status: certificate.status,
      issueDate: certificate.issueDate,
      contractType: certificate.contractType,
      academicData,
      student: certificate.student,
    },
  });
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, message: "Something went wrong" });
  }
});

prisma
  .$connect()
  .then(() => console.log("trustmydegree database connected"))
  .catch((err) => console.error("error in connection to database", err));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
