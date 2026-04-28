const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const sendEmail = require("../utils/sendEmail");
const XLSX = require("xlsx");
const axios = require("axios");
const { uploadAvatarToCloudinary } = require("../services/cloudinary.service");
const universityDB = require("../config/universityDB");
const { uploadPDFtoPinata } = require("../services/pinata.service");
const {
  issueDiploma,
  issueInternship,
  issueStudyCertificate,
  getCertificateData,
  issueDocument,
  issueRankDocument,
  addStudentToRankRegistry,
} = require("../services/blockchain.service");
const {
  revokeCertificate: revokeCertificateOnChain,
  unrevokeCertificate: unrevokeCertificateOnChain,
  verifyCertificate,
} = require("../services/blockchain.service");
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
      requests: fullList,
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
      where: { id },
      include: { student: true },
    });

    if (!findRequest) return res.status(400).json({ message: "Request not found" });

    // only REJECTED is allowed here — APPROVED happens via handleRequestDocument
    if (status !== "REJECTED") {
      return res.status(400).json({ message: "Use the document upload endpoint to approve requests" });
    }

    await prisma.request.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    // notify student of rejection
    await sendEmail(
      findRequest.student.email,
      "Request Update",
      `<h2>Hello ${findRequest.student.fullName}</h2>
       <p>Your request for <strong>${findRequest.documentType}</strong> has been rejected.</p>`
    ).catch((err) => console.warn("Email failed:", err.message));

    res.status(200).json({ message: "Request rejected successfully" });
  } catch (err) {
    res.status(500).json({ error: "An error occurred on the server" });
  }
};

// request upload document
const handleRequestDocument = async (req, res) => {
  const id = req.params.id;
  try {
    if (!req.files || !req.files.document) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files.document;
    const findRequest = await prisma.request.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!findRequest)
      return res.status(400).json({ message: "Request not found" });

    const fileName = `${Date.now()}_${file.name}`;
    const uploadPath = path.join(__dirname, "../../uploads", fileName);
    await file.mv(uploadPath);

    // upload to IPFS
    const ipfsHash = await uploadPDFtoPinata(uploadPath);

    // delete local file
    fs.unlinkSync(uploadPath);

    // store on blockchain
    const blockchainResult = await issueDocument({
      studentId: findRequest.student.matricule,
      studentName: findRequest.student.fullName,
      documentType: findRequest.documentType,
      ipfsHash,
    });

    await prisma.request.update({
      where: { id },
      data: {
        ipfsHash,
        blockchainDocId: blockchainResult.blockchainDocId,
        status: "APPROVED",
      },
    });

    await sendEmail(
      findRequest.student.email,
      "Document Ready for Download",
      `<h2>Hello ${findRequest.student.fullName}</h2>
       <p>The document you requested (<strong>${findRequest.documentType}</strong>) is ready on your dashboard.</p>`,
    );

    res.status(200).json({
      message:
        "Document uploaded to IPFS and stored on blockchain successfully",
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "An error occurred on the server" });
  }
};

// revoke Certificate
const revokeCertificate = async (req, res) => {
  try {
    const id = req.params.id;

    const exist = await prisma.certificate.findUnique({ where: { id } });

    if (!exist)
      return res.status(400).json({ message: "certificate not found" });
    if (exist.status === "REVOKED")
      return res.status(400).json({ message: "certificate already revoked" });

    // blockchain first
    await revokeCertificateOnChain(exist.contractType, exist.blockchainCertId);

    await prisma.certificate.update({
      where: { id },
      data: { status: "REVOKED" },
    });

    res.status(200).json({ message: "Certificate revoked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

const bulkRevokeCertificates = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No certificate IDs provided" });
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const cert = await prisma.certificate.findUnique({ where: { id } });

        if (!cert) {
          errors.push({ id, error: "Certificate not found" });
          continue;
        }

        if (cert.status === "REVOKED") {
          errors.push({ id, error: "Already revoked" });
          continue;
        }

        // revoke on blockchain first
        await revokeCertificateOnChain(cert.contractType, cert.blockchainCertId);

        await prisma.certificate.update({
          where: { id },
          data: { status: "REVOKED" },
        });

        results.push({ id, success: true });
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    res.status(200).json({
      message: `Revoked ${results.length} certificates`,
      revoked: results.length,
      errors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred on the server" });
  }
};

const unrevokeCertificate = async (req, res) => {
  try {
    const id = req.params.id;

    const cert = await prisma.certificate.findUnique({ where: { id } });

    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    if (cert.status !== "REVOKED") return res.status(400).json({ message: "Certificate is not revoked" });

    // get all certificates for same student + contractType from DB
    const allCerts = await prisma.certificate.findMany({
      where: {
        studentId: cert.studentId,
        contractType: cert.contractType,
        NOT: { id: cert.id },
      },
    });

    // check each one on blockchain — if any is active, block the unrevoke
    for (const c of allCerts) {
      if (c.blockchainCertId) {
        const isActive = await verifyCertificate(c.contractType, c.blockchainCertId);
        if (isActive) {
          return res.status(400).json({ 
            message: "Cannot unrevoke — another active certificate already exists for this student on the blockchain. Revoke it first." 
          });
        }
      }
    }

    // unrevoke on blockchain
    await unrevokeCertificateOnChain(cert.contractType, cert.blockchainCertId);

    // sync DB
    await prisma.certificate.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    res.status(200).json({ message: "Certificate unrevoked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred on the server" });
  }
};

// Change admin password
const changePassword = async (req, res) => {
  try {
    const adminId = req.user.userId || req.user.id;
    const { currentPassword, newPassword } = req.body;

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin account not found" });
    }

    // compare
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid current password" });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the database
    await prisma.user.update({
      where: { id: adminId },
      data: { password: hashedNewPassword },
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ error: "An error occurred in the server" });
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
      await sendEmail(
        student.email,
        "Welcome to TrustMyDegree",
        `<h2>Hello ${student.full_name}</h2>
   <p>Your account has been created on TrustMyDegree.</p>
   <p><strong>Matricule:</strong> ${student.matricule}</p>
   <p><strong>Password:</strong> ${dateOfBirth}</p>
   <p>Please login and change your password as soon as possible.</p>
   <p>TrustMyDegree Team</p>`,
      );
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
    // ✅ FIX: destructure both graduationDate and issueDate from req.body
    const {
      issueDate,
      graduationDate,
      templateType,
      branch,
      speciality,
      class: level,
    } = req.body;

    const file = req.files.excel;

    if (!file) return res.status(400).json({ message: "no file uploaded" });

    // ✅ FIX: proper date validation
    if (!graduationDate && !issueDate)
      return res.status(400).json({ message: "date is required" });

    if (!templateType)
      return res.status(400).json({ message: "templateType is required" });

    // ✅ diploma uses graduationDate, everything else uses issueDate
    const date = templateType === "diploma" ? graduationDate : issueDate;

    const workbook = XLSX.read(file.data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0)
      return res.status(400).json({ message: "excel file is empty" });

    // map templateType coming from frontend to the contract name
    const contractType =
      templateType === "internship"
        ? "INTERNSHIP"
        : templateType === "scolarite"
          ? "STUDY"
          : templateType === "rank"
            ? "RANK"
            : "DIPLOMA";

    let created = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const student = await prisma.user.findUnique({
          where: { matricule: String(row.matricule) },
        });

        if (!student) {
          errors.push({ matricule: row.matricule, error: "student not found" });
          continue;
        }

        // duplicate check — one certificate per student per contractType
        const existingCert = await prisma.certificate.findFirst({
          where: { 
            studentId: student.id,
            contractType,
            status: "ACTIVE"
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

        // store on blockchain
        // ipfsHash is "pending" because we don't have the PDF yet
        let blockchainResult;

        if (contractType === "DIPLOMA") {
          blockchainResult = await issueDiploma({
            studentId: student.matricule,
            studentName: student.fullName,
            degreeName: row.type || templateType,
            fieldOfStudy: row.speciality || "",
            ipfsHash: "pending",
          });
        } else if (contractType === "INTERNSHIP") {
          // Try multiple column names for internship role
          const internshipRole = row.speciality || row.specialty || row.role || row.position || row.internshipRole || row["Internship Role"] || row["Role"];
          if (!internshipRole || internshipRole.trim() === "") {
            console.error(`Internship data for ${row.matricule}:`, JSON.stringify(row));
            throw new Error(`Internship role/specialty is required. Available columns: ${Object.keys(row).join(", ")}`);
          }

          const start = row.startDate ? new Date(row.startDate) : null;
          let end = row.endDate ? new Date(row.endDate) : null;

          if (!start || !end) {
            throw new Error("Start date and end date are required for internships");
          }

          if (new Date(end) <= new Date(start)) {
            throw new Error("End date must be after start date");
          }

          const endDate = new Date(end);
          endDate.setDate(endDate.getDate() + 1);

          blockchainResult = await issueInternship({
            studentId: student.matricule,
            studentName: student.fullName,
            companyName: row.company || row.Company || "ENSTA",
            internshipRole: internshipRole.trim(),
            internshipCity: row.internshipCity || row.city || row.City || "",
            ipfsHash: "pending",
            startDate: start.toISOString(),
            endDate: endDate.toISOString(),
          });
          }  else if (contractType === "RANK") {
              const rankValue = Number(row["rank"] || 0);
              const nomValue = row["familyName"] || "";
              const prenomValue = row["name"] || "";
              const averageValue = String(row["average"] || "0");
              const creditsValue = Number(row["credits"] || 0);
              const sessionValue = String(row["session"] || "NORMAL")
                .toLowerCase()
                .includes("rattrapage") ? "RATTRAPAGE" : "NORMAL";

              // register student in RankRegistry first (contract requires studentExists)
                try {
                  await addStudentToRankRegistry({
                    matricule: student.matricule,
                    name: prenomValue || student.fullName?.split(" ")[0] || "",
                    familyName: nomValue || student.fullName?.split(" ").slice(1).join(" ") || "",
                    speciality: speciality || "",
                    branch: branch || "",
                    year: level || "",
                    rank: rankValue,
                    average: averageValue,
                    credits: creditsValue,
                    session: sessionValue,
                  });

                  await prisma.user.update({
                    where: { id: student.id },
                    data: { blockchainRegistered: true },
                  });
                } catch (err) {
                  // student already exists on chain — still mark as registered
                  console.log(`Student ${student.matricule} rank registry:`, err.message);
                  await prisma.user.update({
                    where: { id: student.id },
                    data: { blockchainRegistered: true },
                  });
                }
                await new Promise(resolve => setTimeout(resolve, 1000));

              // issue rank document on RankRegistry
              blockchainResult = await issueRankDocument({
                matricule: student.matricule,
                documentType: "Rank Certificate",
                description: `Rank ${rankValue} — ${speciality || ""}`,
                ipfsHash: "pending",
              });
            }else {
          // STUDY / scolarite
          blockchainResult = await issueStudyCertificate({
            studentId: student.matricule,
            studentName: student.fullName,
            programName: row.speciality || "",
            academicYear: row.academicYear || date,
            certificateType: row.type || templateType,
            ipfsHash: "pending",
          });
        }

        const specialityMap = {
          "cp-mi": "Mathématiques et Informatique",
          "cp-st": "Sciences et Technologies",
        };

        const specialityKey = `${speciality}-${branch}`.toLowerCase();
        const resolvedSpecialty = specialityMap[specialityKey] || speciality || row.speciality || row.specialty || "";

        // save to Prisma
        await prisma.certificate.create({
          data: {
            studentId: student.id,
            uniqueCode,
            ipfsHash: null,    
            certData: {             
              fullName: student.fullName,
              matricule: student.matricule,
              specialty: resolvedSpecialty,
              faculty: row.faculty || "",
              sectionNum: String(row.sectionNum || ""),
              facultyNum: String(row.facultyNum || ""),
              mention: row.mention || "",
              graduationDate,
              issueDate: new Date().toISOString().split("T")[0],
              uniqueCode,
              academicYear: row.academicYear || "",
              year: row.year || "",
              company: row.company || "",
              duration: row.duration || "",
              startDate: row.startDate || "",
              birthDate: student.dateOfBirth || "",
              birthPlace: student.placeOfBirth || "",
              endDate: row.endDate || "",
              internshipCity: row.internshipCity || "",
              level: row.level || "",
              field: row.field || "",
              average: row.average || "",
              rank: row.rank || "",
              branch: branch || "",
              class: level || "",
              templateType,
            },
            blockchainCertId: blockchainResult.blockchainCertId,
            contractType,
            type: row.type || templateType,
            specialty: resolvedSpecialty,
            status: "ACTIVE",
            issueDate: new Date(),
          },
        });

        // mark student as graduated
        await prisma.user.update({
          where: { id: student.id },
          data: { isGraduated: true },
        });

        // notify student by email
        try {
        await sendEmail(
          student.email,
          "Your Certificate is Ready 🎓",
          `<h2>Congratulations ${student.fullName}!</h2>
          <p>Your certificate is now available on your dashboard.</p>
          <a href="${process.env.FRONTEND_URL}/login"
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
            If the button doesn't work, copy this link: ${process.env.FRONTEND_URL}/login
          </p>`,
        );
      } catch (emailErr) {
        console.error(`Email failed for matricule ${row.matricule}:`, emailErr.message);
      }

        created++;
      } catch (rowErr) {
        console.error(`Error on matricule ${row.matricule}:`, rowErr.message);
        errors.push({ matricule: row.matricule, error: rowErr.message });
      }
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
    const totalMaster = await prisma.certificate.count({ where: { type: "MASTER" } });
    const totalEngineer = await prisma.certificate.count({ where: { type: "ENGINEER" } });
    const totalInternship = await prisma.certificate.count({ where: { contractType: "INTERNSHIP" } });
    const totalScolarite = await prisma.certificate.count({ where: { contractType: "STUDY" } });
    const totalDiploma = await prisma.certificate.count({ where: { contractType: "DIPLOMA" } });
    const totalRank = await prisma.certificate.count({ where: { contractType: "RANK" } });

    const DistributionByType = {
      MASTER: totalMaster,
      ENGINEER: totalEngineer,
      INTERNSHIP: totalInternship,
      SCOLARITE: totalScolarite,
      DIPLOMA: totalDiploma,
      RANK: totalRank,
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
      monthlyIssuance[month] = (monthlyIssuance[month] || 0) + 1;
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const verifications = await prisma.verification.findMany({
      where: { verifiedAt: { gte: thirtyDaysAgo } },
    });

    const verificationsPerDay = {};
    verifications.forEach((v) => {
      const day = new Date(v.verifiedAt).toISOString().split("T")[0];
      verificationsPerDay[day] = (verificationsPerDay[day] || 0) + 1;
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
      where: { id },
      include: { student: true },
    });

    if (!certificate) return res.status(404).json({ message: "Certificate not found" });

    // --- Early return: if PDF already uploaded, stream directly from Filebase ---
    if (certificate.ipfsHash && certificate.ipfsHash !== "pending") {
      const ipfsUrl = `https://ipfs.filebase.io/ipfs/${certificate.ipfsHash}`;
      const response = await axios.get(ipfsUrl, { responseType: "stream" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="certificate_${id}.pdf"`);
      return response.data.pipe(res);
    }

    // --- Step 1: Fetch the source-of-truth data from the blockchain ---
    console.log("[downloadCertificate] Fetching blockchain data for cert:", id);
    const chainData = await getCertificateData(certificate.contractType, certificate.blockchainCertId);
    console.log("[downloadCertificate] Blockchain data received:", JSON.stringify(chainData));

    // --- Step 2: Build the PDF data object from blockchain (immutable) ---
    // Fields the blockchain stores — these are authoritative and tamper-proof.
    // Fields the blockchain does NOT store (birthDate, birthPlace, faculty numbers etc.)
    // are pulled from certData as cosmetic/layout info only.
    const prismaFallback = certificate.certData || {};
    const templateType = prismaFallback.templateType || certificate.contractType.toLowerCase();

    let pdfData = {
      // Always from Prisma (non-academic, layout/identity fields)
      uniqueCode:   prismaFallback.uniqueCode   || certificate.uniqueCode,
      birthDate:    prismaFallback.birthDate     || certificate.student?.dateOfBirth || "",
      birthPlace:   prismaFallback.birthPlace    || certificate.student?.placeOfBirth || "",
      faculty:      prismaFallback.faculty       || "",
      sectionNum:   prismaFallback.sectionNum    || "",
      facultyNum:   prismaFallback.facultyNum    || "",
      templateType,
    };

    if (certificate.contractType === "DIPLOMA") {
      // Blockchain fields: studentName, degreeName, fieldOfStudy, issueDate, (graduationDate via issueDate)
      const issueDateMs = Number(chainData.issueDate) * 1000;
      const issueDateStr = new Date(issueDateMs).toLocaleDateString("fr-FR");
      pdfData = {
        ...pdfData,
        fullName:       chainData.studentName,
        specialty:      chainData.fieldOfStudy,
        mention:        prismaFallback.mention || "",
        graduationDate: issueDateStr,
        issueDate:      issueDateStr,
      };

    } else if (certificate.contractType === "INTERNSHIP") {
      // Blockchain fields: studentName, companyName, internshipRole, internshipCity, startDate, endDate, issueDate
      const fmt = (ts) => new Date(Number(ts) * 1000).toLocaleDateString("fr-FR");
      pdfData = {
        ...pdfData,
        fullName:      chainData.studentName,
        specialty:     chainData.internshipRole,
        company:       chainData.companyName,
        internshipCity: chainData.internshipCity || "",
        startDate:     fmt(chainData.startDate),
        endDate:       fmt(chainData.endDate),
        issueDate:     fmt(chainData.issueDate),
        field:         prismaFallback.field || chainData.internshipRole || "",
        duration:      prismaFallback.duration || "",
      };

    } else if (certificate.contractType === "STUDY") {
      // Blockchain fields: studentName, programName, academicYear, certificateType, issueDate
      pdfData = {
        ...pdfData,
        fullName:     chainData.studentName,
        matricule:    certificate.student?.matricule || prismaFallback.matricule || "",
        specialty:    chainData.programName,
        academicYear: chainData.academicYear,
        level:        chainData.certificateType || prismaFallback.level || "",
        issueDate:    new Date(Number(chainData.issueDate) * 1000).toLocaleDateString("fr-FR"),
      };

    } else if (certificate.contractType === "RANK") {
      // Blockchain fields: studentName(via matricule), rank, average, speciality, branch, year, session, issueDate
      const issueDateStr = new Date(Number(chainData.issueDate) * 1000).toLocaleDateString("fr-FR");
      pdfData = {
        ...pdfData,
        fullName:     certificate.student?.fullName || prismaFallback.fullName || "",
        matricule:    certificate.student?.matricule || chainData.matricule || "",
        specialty:    chainData.speciality || "",
        average:      chainData.average || "",
        rank:         chainData.rank || "",
        branch:       chainData.branch || "",
        class:        chainData.year || prismaFallback.class || "",
        academicYear: prismaFallback.academicYear || "",
        issueDate:    issueDateStr,
      };
    }

    // --- Step 3: Generate the PDF from blockchain-sourced data ---
    console.log("[downloadCertificate] Generating PDF from blockchain data...");
    const generateDiplomaPDF = require("../utils/generatePDF");
    const pdfPath = await generateDiplomaPDF(pdfData, templateType);
    console.log("[downloadCertificate] PDF generated at:", pdfPath);
    
  // --- Step 4: Stream local file to client immediately ---
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="certificate_${id}.pdf"`);
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    // --- Step 5: Upload to Filebase in background after streaming starts ---
    fileStream.on("end", async () => {
      try {
        const ipfsHash = await uploadPDFtoPinata(pdfPath);
        await prisma.certificate.update({ where: { id }, data: { ipfsHash } });
        fs.unlinkSync(pdfPath);
        console.log("[downloadCertificate] Uploaded to Filebase:", ipfsHash);
      } catch (uploadErr) {
        console.error("[downloadCertificate] Filebase upload failed:", uploadErr.message);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      }
    });
    if (!fs.existsSync(pdfPath)) {
      return res.status(500).json({ error: "PDF generation failed — file not found on disk" });
    }

 

  } catch (err) {
    console.error("[downloadCertificate] ERROR:", err.message);
    console.error(err.stack);
    res.status(500).json({ error: "An error occurred on the server", detail: err.message });
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
      "Contract Type": cert.contractType || "",
      "IPFS Hash": cert.ipfsHash || "",
      "Blockchain Cert ID": cert.blockchainCertId || "",
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

const downloadRequestFile = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({ where: { id } });

    if (!request) return res.status(404).json({ message: "File not found" });
    if (!request.ipfsHash)
      return res.status(404).json({ message: "File not available" });

    const ipfsUrl = `https://ipfs.filebase.io/ipfs/${request.ipfsHash}`;
    const response = await axios.get(ipfsUrl, { responseType: "stream" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="request_${id}.pdf"`,
    );
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const exportRequests = async (req, res) => {
  try {
    const requests = await prisma.request.findMany({
      include: { student: true },
      orderBy: { createdAt: "desc" },
    });

    const rows = requests.map((req) => ({
      "Request ID": req.id.substring(0, 8) + "...",
      "Student Name": req.student?.fullName || "",
      Matricule: req.student?.matricule || "",
      "Document Type": req.documentType || "",
      Reason: req.reason || "",
      Priority: req.priority || "",
      "Submitted Date": new Date(req.createdAt).toLocaleDateString("fr-FR"),
      Status: req.status || "PENDING",
      "IPFS Hash": req.ipfsHash || "",
      "Blockchain Doc ID": req.blockchainDocId || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=requests.xlsx",
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

const getAuditTrail = async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: { student: true },
      orderBy: { issueDate: "desc" },
    });

    const trail = certificates.map((cert) => ({
      id: cert.id,
      uniqueCode: cert.uniqueCode,
      studentName: cert.student?.fullName || "Unknown",
      studentAvatar: cert.student?.avatar || null,
      matricule: cert.student?.matricule || "",
      type: cert.type || "",
      specialty: cert.specialty || "",
      contractType: cert.contractType || "",
      blockchainCertId: cert.blockchainCertId || "",
      ipfsHash: cert.ipfsHash || "",
      ipfsUrl: cert.ipfsHash
        ? `https://ipfs.filebase.io/ipfs/${cert.ipfsHash}`
        : null,
      status: cert.status,
      issueDate: cert.issueDate,
    }));

    res.status(200).json({ trail });
  } catch (err) {
    console.error(err);
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
  changePassword,
  revokeCertificate,
  bulkRevokeCertificates,
  unrevokeCertificate,
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
  exportRequests,
  downloadRequestFile,
  getAuditTrail,
  uploadAvatar,
};