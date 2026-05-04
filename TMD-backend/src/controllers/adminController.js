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
  updateStudentInRankRegistry,
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
      select: {
        id: true,
        uniqueCode: true,
        type: true,
        contractType: true,
        status: true,
        issueDate: true,
        student: {
          select: {
            fullName: true,
            avatar: true,
          },
        },
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

const getAllCertificates = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 8);
    const skip   = (page - 1) * limit;

    const { search, status, sortKey, sortDir } = req.query;

    const where = {};
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { student: { fullName:  { contains: search, mode: "insensitive" } } },
        { student: { matricule: { contains: search, mode: "insensitive" } } },
        { type:      { contains: search, mode: "insensitive" } },
        { specialty: { contains: search, mode: "insensitive" } },
      ];
    }

    const allowedSortKeys = {
      issueDate:  { issueDate: sortDir === "desc" ? "desc" : "asc" },
      status:     { status:    sortDir === "desc" ? "desc" : "asc" },
      type:       { type:      sortDir === "desc" ? "desc" : "asc" },
      specialty:  { specialty: sortDir === "desc" ? "desc" : "asc" },
      student:    { student: { fullName: sortDir === "desc" ? "desc" : "asc" } },
      matricule:  { student: { matricule: sortDir === "desc" ? "desc" : "asc" } },
    };
    const orderBy = allowedSortKeys[sortKey] || { issueDate: "desc" };

    const [total, certificates] = await Promise.all([
      prisma.certificate.count({ where }),
      prisma.certificate.findMany({
        where,
        select: {
          id: true,
          type: true,
          specialty: true,
          status: true,
          issueDate: true,
          contractType: true,
          blockchainCertId: true,
          ipfsHash: true,
          student: {
            select: {
              fullName: true,
              matricule: true,
              avatar: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip,
      }),
    ]);

    res.status(200).json({
      certificates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

const getRequests = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const { search, status } = req.query;

    const where = {};
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { student: { fullName:  { contains: search, mode: "insensitive" } } },
        { student: { matricule: { contains: search, mode: "insensitive" } } },
        { documentType: { contains: search, mode: "insensitive" } },
        { reason:       { contains: search, mode: "insensitive" } },
      ];
    }

    const [statusGroups, total, requests] = await Promise.all([
      prisma.request.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        select: {
          id: true,
          documentType: true,
          reason: true,
          delivery: true,
          priority: true,
          status: true,
          ipfsHash: true,
          blockchainDocId: true,
          fileUrl: true,
          createdAt: true,
          updatedAt: true,
          student: { select: { fullName: true, matricule: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    const summary = { total: 0, pending: 0, approved: 0, rejected: 0 };
    statusGroups.forEach(g => {
      summary.total += g._count.id;
      if (g.status === "PENDING")  summary.pending  = g._count.id;
      if (g.status === "APPROVED") summary.approved = g._count.id;
      if (g.status === "REJECTED") summary.rejected = g._count.id;
    });

    res.status(200).json({
      requests,
      summary,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

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

    if (!exist) return res.status(400).json({ message: "certificate not found" });
    if (exist.status === "REVOKED") return res.status(400).json({ message: "certificate already revoked" });

    await prisma.certificate.update({
      where: { id },
      data: { status: "REVOKED" },
    });

    try {
      await revokeCertificateOnChain(exist.contractType, exist.blockchainCertId);
    } catch (chainErr) {
      console.error("Blockchain revoke failed (DB already updated):", chainErr.message);
    }

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
            message: "Cannot unrevoke — another active certificate already exists for this student on the blockchain. Revoke it first.",
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

const syncStudents = async (req, res) => {
  try {
    const result = await universityDB.query("SELECT * FROM students");
    const students = result.rows;
    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "no students found in university database" });
    }

    let created = 0;
    let skipped = 0;

    const incomingMatricules = students.map(s => s.matricule);
    const existing = await prisma.user.findMany({
      where: { matricule: { in: incomingMatricules } },
      select: { matricule: true },
    });
    const existingSet = new Set(existing.map(u => u.matricule));

    const toCreate = students.filter(s => !existingSet.has(s.matricule));
    skipped = students.length - toCreate.length;

    await Promise.all(
      toCreate.map(async (student) => {
        const dateOfBirth = student.date_of_birth.toLocaleDateString("en-CA");
        const hashed = await bcrypt.hash(dateOfBirth, 10);
        await prisma.user.create({
          data: {
            fullName:    student.full_name,
            matricule:   student.matricule,
            password:    hashed,
            role:        "STUDENT",
            dateOfBirth: dateOfBirth,
            placeOfBirth: student.place_of_birth,
            isGraduated: student.is_graduated,
            email:       student.email,
          },
        });
        sendEmail(
          student.email,
          "Welcome to TrustMyDegree",
          `<h2>Hello ${student.full_name}</h2>
   <p>Your account has been created on TrustMyDegree.</p>
   <p><strong>Matricule:</strong> ${student.matricule}</p>
   <p><strong>Password:</strong> ${dateOfBirth}</p>
   <p>Please login and change your password as soon as possible.</p>
   <p>TrustMyDegree Team</p>`,
        ).catch(err => console.warn(`Email failed for ${student.matricule}:`, err.message));
        created++;
      })
    );

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

    if (!graduationDate && !issueDate)
      return res.status(400).json({ message: "date is required" });

    if (!templateType)
      return res.status(400).json({ message: "templateType is required" });

    const date = templateType === "diploma" ? graduationDate : issueDate;

    const workbook = XLSX.read(file.data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0)
      return res.status(400).json({ message: "excel file is empty" });

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
          } else if (contractType === "RANK") {
            const rankValue    = Number(row["rank"] || 0);
            const nomValue     = row["familyName"] || "";
            const prenomValue  = row["name"] || "";
            const averageValue = String(row["average"] || "0");
            const creditsValue = Number(row["credits"] || 0);
            const sessionValue = String(row["session"] || "NORMAL")
              .toLowerCase()
              .includes("rattrapage") ? "RATTRAPAGE" : "NORMAL";

            const rankPayload = {
              matricule:   student.matricule,
              name:        prenomValue || student.fullName?.split(" ")[0] || "",
              familyName:  nomValue || student.fullName?.split(" ").slice(1).join(" ") || "",
              speciality:  speciality || "",
              branch:      branch || "",
              year:        level || "",
              rank:        rankValue,
              average:     averageValue,
              credits:     creditsValue,
              session:     sessionValue,
            };

            try {
              await addStudentToRankRegistry(rankPayload);
            } catch (addErr) {
              if (addErr.message?.toLowerCase().includes("already exists")) {
                await updateStudentInRankRegistry(rankPayload);
              } else {
                throw addErr;
              }
            }

            await prisma.user.update({
              where: { id: student.id },
              data: { blockchainRegistered: true },
            });

            blockchainResult = await issueRankDocument({
              matricule:    student.matricule,
              documentType: "Rank Certificate",
              description:  `Rank ${rankValue} — ${speciality || ""}`,
              ipfsHash:     "pending",
            });
          }
          else {
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

        await prisma.user.update({
          where: { id: student.id },
          data: { isGraduated: true },
        });

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

const getStatistics = async (req, res) => {
  try {
    const [typeGroups, topSpecialties, monthlyRaw, dailyRaw] = await Promise.all([
      prisma.certificate.groupBy({
        by: ["type", "contractType"],
        _count: { id: true },
      }),

      prisma.certificate.groupBy({
        by: ["specialty"],
        _count: { specialty: true },
        orderBy: { _count: { specialty: "desc" } },
        take: 5,
      }),

      prisma.$queryRaw`
        SELECT
          TO_CHAR("issueDate" AT TIME ZONE 'UTC', 'Mon') AS month,
          COUNT(*)::int AS count
        FROM "Certificate"
        WHERE EXTRACT(YEAR FROM "issueDate" AT TIME ZONE 'UTC') = EXTRACT(YEAR FROM NOW())
        GROUP BY TO_CHAR("issueDate" AT TIME ZONE 'UTC', 'Mon')
      `,

      prisma.$queryRaw`
        SELECT
          TO_CHAR("verifiedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
          COUNT(*)::int AS count
        FROM "Verification"
        WHERE "verifiedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY TO_CHAR("verifiedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
        ORDER BY day ASC
      `,
    ]);

    const DistributionByType = { MASTER: 0, ENGINEER: 0, INTERNSHIP: 0, SCOLARITE: 0, DIPLOMA: 0, RANK: 0 };
    typeGroups.forEach(g => {
      if (g.type === "MASTER")             DistributionByType.MASTER      += g._count.id;
      if (g.type === "ENGINEER")           DistributionByType.ENGINEER    += g._count.id;
      if (g.contractType === "INTERNSHIP") DistributionByType.INTERNSHIP  += g._count.id;
      if (g.contractType === "STUDY")      DistributionByType.SCOLARITE   += g._count.id;
      if (g.contractType === "DIPLOMA")    DistributionByType.DIPLOMA     += g._count.id;
      if (g.contractType === "RANK")       DistributionByType.RANK        += g._count.id;
    });

    const monthlyIssuance = {};
    monthlyRaw.forEach(row => {
      monthlyIssuance[row.month] = Number(row.count);
    });

    const verificationsPerDay = {};
    dailyRaw.forEach(row => {
      verificationsPerDay[row.day] = Number(row.count);
    });

    res.status(200).json({ DistributionByType, topSpecialties, monthlyIssuance, verificationsPerDay });
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

    if (certificate.ipfsHash && certificate.ipfsHash !== "pending") {
      const ipfsUrl = `https://ipfs.filebase.io/ipfs/${certificate.ipfsHash}`;
      const response = await axios.get(ipfsUrl, { responseType: "stream" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="certificate_${id}.pdf"`);
      return response.data.pipe(res);
    }

    console.log("[downloadCertificate] Fetching blockchain data for cert:", id);
    const chainData = await getCertificateData(certificate.contractType, certificate.blockchainCertId);
    console.log("[downloadCertificate] Blockchain data received:", JSON.stringify(chainData));

    const prismaFallback = certificate.certData || {};
    const templateType = prismaFallback.templateType || certificate.contractType.toLowerCase();

    let pdfData = {
      uniqueCode:   prismaFallback.uniqueCode   || certificate.uniqueCode,
      birthDate:    prismaFallback.birthDate     || certificate.student?.dateOfBirth || "",
      birthPlace:   prismaFallback.birthPlace    || certificate.student?.placeOfBirth || "",
      faculty:      prismaFallback.faculty       || "",
      sectionNum:   prismaFallback.sectionNum    || "",
      facultyNum:   prismaFallback.facultyNum    || "",
      templateType,
    };

    if (certificate.contractType === "DIPLOMA") {
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

    console.log("[downloadCertificate] Generating PDF from blockchain data...");
    const generateDiplomaPDF = require("../utils/generatePDF");
    const pdfPath = await generateDiplomaPDF(pdfData, templateType);
    console.log("[downloadCertificate] PDF generated at:", pdfPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="certificate_${id}.pdf"`);
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

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
    const CHUNK = 500;
    let skip = 0;
    const rows = [];

    while (true) {
      const batch = await prisma.certificate.findMany({
        select: {
          type: true,
          specialty: true,
          contractType: true,
          ipfsHash: true,
          blockchainCertId: true,
          issueDate: true,
          status: true,
          uniqueCode: true,
          student: { select: { fullName: true, matricule: true } },
        },
        orderBy: { issueDate: "desc" },
        take: CHUNK,
        skip,
      });

      if (batch.length === 0) break;

      batch.forEach((cert) => rows.push({
        "Student Name":       cert.student?.fullName   || "",
        "Matricule":          cert.student?.matricule  || "",
        "Type":               cert.type               || "",
        "Specialty":          cert.specialty           || "",
        "Contract Type":      cert.contractType        || "",
        "IPFS Hash":          cert.ipfsHash            || "",
        "Blockchain Cert ID": cert.blockchainCertId    || "",
        "Issue Date":         new Date(cert.issueDate).toLocaleDateString("fr-FR"),
        "Status":             cert.status              || "",
        "Unique Code":        cert.uniqueCode          || "",
      }));

      skip += CHUNK;
      if (batch.length < CHUNK) break;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Certificates");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=certificates.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
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
    const CHUNK = 500;
    let skip = 0;
    const rows = [];

    while (true) {
      const batch = await prisma.request.findMany({
        select: {
          id: true,
          documentType: true,
          reason: true,
          priority: true,
          status: true,
          ipfsHash: true,
          blockchainDocId: true,
          createdAt: true,
          student: { select: { fullName: true, matricule: true } },
        },
        orderBy: { createdAt: "desc" },
        take: CHUNK,
        skip,
      });

      if (batch.length === 0) break;

      batch.forEach((r) => rows.push({
        "Request ID":        r.id.substring(0, 8) + "...",
        "Student Name":      r.student?.fullName  || "",
        "Matricule":         r.student?.matricule || "",
        "Document Type":     r.documentType       || "",
        "Reason":            r.reason             || "",
        "Priority":          r.priority           || "",
        "Submitted Date":    new Date(r.createdAt).toLocaleDateString("fr-FR"),
        "Status":            r.status             || "PENDING",
        "IPFS Hash":         r.ipfsHash           || "",
        "Blockchain Doc ID": r.blockchainDocId    || "",
      }));

      skip += CHUNK;
      if (batch.length < CHUNK) break;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=requests.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};

const getAuditTrail = async (req, res) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(50, parseInt(req.query.limit) || 10);
    const skip    = (page - 1) * limit;

    const { search, status, contractType } = req.query;

    const where = {};
    if (status && status !== "ALL") where.status = status;
    if (contractType && contractType !== "ALL") where.contractType = contractType;
    if (search) {
      where.OR = [
        { student: { fullName:  { contains: search, mode: "insensitive" } } },
        { student: { matricule: { contains: search, mode: "insensitive" } } },
        { specialty:        { contains: search, mode: "insensitive" } },
        { uniqueCode:       { contains: search, mode: "insensitive" } },
        { blockchainCertId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, certificates] = await Promise.all([
      prisma.certificate.count({ where }),
      prisma.certificate.findMany({
        where,
        select: {
          id: true,
          uniqueCode: true,
          type: true,
          specialty: true,
          contractType: true,
          blockchainCertId: true,
          ipfsHash: true,
          status: true,
          issueDate: true,
          student: {
            select: {
              fullName: true,
              matricule: true,
              avatar: true,
            },
          },
        },
        orderBy: { issueDate: "desc" },
        take: limit,
        skip,
      }),
    ]);

    const trail = certificates.map((cert) => ({
      ...cert,
      studentName: cert.student?.fullName || "Unknown",
      matricule:   cert.student?.matricule || "",
      ipfsUrl:     cert.ipfsHash ? `https://ipfs.filebase.io/ipfs/${cert.ipfsHash}` : null,
    }));

    res.status(200).json({
      trail,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "an error occurred in the server" });
  }
};
const getAuditStats = async (req, res) => {
  try {
    const [statusGroups, contractGroups, total] = await Promise.all([
      prisma.certificate.groupBy({ by: ["status"],       _count: { id: true } }),
      prisma.certificate.groupBy({ by: ["contractType"], _count: { id: true } }),
      prisma.certificate.count(),
    ]);

    const stats = { total, active: 0, revoked: 0, diploma: 0, internship: 0, study: 0, rank: 0 };
    statusGroups.forEach(g => {
      if (g.status === "ACTIVE")  stats.active  = g._count.id;
      if (g.status === "REVOKED") stats.revoked = g._count.id;
    });
    contractGroups.forEach(g => {
      if (g.contractType === "DIPLOMA")    stats.diploma    = g._count.id;
      if (g.contractType === "INTERNSHIP") stats.internship = g._count.id;
      if (g.contractType === "STUDY")      stats.study      = g._count.id;
      if (g.contractType === "RANK")       stats.rank       = g._count.id;
    });

    res.status(200).json(stats);
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

const issueOne = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      studentId,
      email,
      templateType,
      branch,
      speciality,
      class: level,
      graduationDate,
      issueDate,
    } = req.body;

    if (!firstName)    return res.status(400).json({ message: "First name is required" });
    if (!lastName)     return res.status(400).json({ message: "Last name is required" });
    if (!studentId)    return res.status(400).json({ message: "Student ID is required" });
    if (!templateType) return res.status(400).json({ message: "templateType is required" });
    if (!graduationDate && !issueDate)
      return res.status(400).json({ message: "Date is required" });

    if (templateType === "diploma") {
      if (!speciality)          return res.status(400).json({ message: "Speciality is required" });
      if (!req.body.mention)    return res.status(400).json({ message: "Mention is required" });
      if (!req.body.faculty)    return res.status(400).json({ message: "Faculty is required" });
      if (!req.body.sectionNum) return res.status(400).json({ message: "Section N° is required" });
      if (!req.body.facultyNum) return res.status(400).json({ message: "Faculty N° is required" });
      if (!req.body.year)       return res.status(400).json({ message: "Year is required" });
    }

    if (templateType === "scolarite") {
      if (!speciality)             return res.status(400).json({ message: "Speciality is required" });
      if (!req.body.mention)       return res.status(400).json({ message: "Mention is required" });
      if (!req.body.faculty)       return res.status(400).json({ message: "Faculty is required" });
      if (!req.body.sectionNum)    return res.status(400).json({ message: "Section N° is required" });
      if (!req.body.facultyNum)    return res.status(400).json({ message: "Faculty N° is required" });
      if (!req.body.year)          return res.status(400).json({ message: "Year is required" });
      if (!req.body.academicYear)  return res.status(400).json({ message: "Academic Year is required" });
    }

    if (templateType === "internship") {
      if (!speciality)              return res.status(400).json({ message: "Internship role is required" });
      if (!req.body.company)        return res.status(400).json({ message: "Company is required" });
      if (!req.body.internshipCity) return res.status(400).json({ message: "City is required" });
      if (!req.body.startDate)      return res.status(400).json({ message: "Start date is required" });
      if (!req.body.endDate)        return res.status(400).json({ message: "End date is required" });
    }

    if (templateType === "rank") {
      if (!branch)           return res.status(400).json({ message: "Branch is required" });
      if (!speciality)       return res.status(400).json({ message: "Speciality is required" });
      if (!level)            return res.status(400).json({ message: "Class is required" });
      if (!req.body.rank)    return res.status(400).json({ message: "Rank is required" });
      if (!req.body.average) return res.status(400).json({ message: "Average is required" });
      if (!req.body.credits) return res.status(400).json({ message: "Credits are required" });
      const rankNum    = Number(req.body.rank);
      const avgNum     = Number(req.body.average);
      const creditsNum = Number(req.body.credits);
      if (isNaN(rankNum) || rankNum <= 0)
        return res.status(400).json({ message: "Rank must be a positive number" });
      if (isNaN(avgNum) || avgNum < 0 || avgNum > 20)
        return res.status(400).json({ message: "Average must be between 0 and 20" });
      if (isNaN(creditsNum) || creditsNum <= 0)
        return res.status(400).json({ message: "Credits must be a positive number" });
    }

    const date = templateType === "diploma" ? graduationDate : issueDate;

    const student = await prisma.user.findUnique({
      where: { matricule: String(studentId) },
    });

    if (!student) {
      return res.status(404).json({ message: `Student with matricule "${studentId}" not found. Make sure they are synced first.` });
    }

    const contractType =
      templateType === "internship"
        ? "INTERNSHIP"
        : templateType === "scolarite"
          ? "STUDY"
          : templateType === "rank"
            ? "RANK"
            : "DIPLOMA";

    const existingCert = await prisma.certificate.findFirst({
      where: {
        studentId: student.id,
        contractType,
        status: "ACTIVE",
      },
    });

    if (existingCert) {
      return res.status(400).json({ message: "An active certificate of this type already exists for this student." });
    }

    const uniqueCode = `CERT-${student.matricule}-${Date.now()}`;
    let blockchainResult;

    if (contractType === "DIPLOMA") {
      blockchainResult = await issueDiploma({
        studentId: student.matricule,
        studentName: student.fullName,
        degreeName: templateType,
        fieldOfStudy: speciality || "",
        ipfsHash: "pending",
      });

    } else if (contractType === "INTERNSHIP") {
      const start = new Date(req.body.startDate);
      const end   = new Date(req.body.endDate);

      if (end <= start) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      const endDateAdj = new Date(end);
      endDateAdj.setDate(endDateAdj.getDate() + 1);

      blockchainResult = await issueInternship({
        studentId: student.matricule,
        studentName: student.fullName,
        companyName: req.body.company,
        internshipRole: speciality.trim(),
        internshipCity: req.body.internshipCity,
        ipfsHash: "pending",
        startDate: start.toISOString(),
        endDate: endDateAdj.toISOString(),
      });

    } else if (contractType === "RANK") {
      try {
        const rankPayload = {
          matricule:  student.matricule,
          name:       firstName,
          familyName: lastName,
          speciality: speciality || "",
          branch:     branch || "",
          year:       level || "",
          rank:       Number(req.body.rank),
          average:    String(req.body.average),
          credits:    Number(req.body.credits),
          session:    String(req.body.session || "NORMAL").toLowerCase().includes("rattrapage")
            ? "RATTRAPAGE"
            : "NORMAL",
        };

        try {
          await addStudentToRankRegistry(rankPayload);
        } catch (addErr) {
          if (addErr.message?.toLowerCase().includes("already exists")) {
            await updateStudentInRankRegistry(rankPayload);
          } else {
            throw addErr;
          }
        }

        await prisma.user.update({
          where: { id: student.id },
          data: { blockchainRegistered: true },
        });
      } catch (err) {
        console.error(`Rank registry error for ${student.matricule}:`, err.message);
        throw err;
      }

      blockchainResult = await issueRankDocument({
        matricule:    student.matricule,
        documentType: "Rank Certificate",
        description:  `Rank ${Number(req.body.rank)} — ${speciality || ""}`,
        ipfsHash:     "pending",
      });

    } else {
      blockchainResult = await issueStudyCertificate({
        studentId: student.matricule,
        studentName: student.fullName,
        programName: speciality || "",
        academicYear: req.body.academicYear || date,
        certificateType: templateType,
        ipfsHash: "pending",
      });
    }

    const specialityMap = {
      "cp-mi": "Mathématiques et Informatique",
      "cp-st": "Sciences et Technologies",
    };
    const specialityKey = `${speciality}-${branch}`.toLowerCase();
    const resolvedSpecialty = specialityMap[specialityKey] || speciality || "";

    await prisma.certificate.create({
      data: {
        studentId: student.id,
        uniqueCode,
        ipfsHash: null,
        certData: {
          fullName:      student.fullName,
          matricule:     student.matricule,
          specialty:     resolvedSpecialty,
          faculty:       req.body.faculty       || "",
          sectionNum:    String(req.body.sectionNum || ""),
          facultyNum:    String(req.body.facultyNum || ""),
          mention:       req.body.mention        || "",
          graduationDate: graduationDate          || "",
          issueDate:     new Date().toISOString().split("T")[0],
          uniqueCode,
          academicYear:  req.body.academicYear   || "",
          year:          req.body.year           || "",
          company:       req.body.company        || "",
          duration:      req.body.duration       || "",
          startDate:     req.body.startDate      || "",
          birthDate:     student.dateOfBirth     || "",
          birthPlace:    student.placeOfBirth    || "",
          endDate:       req.body.endDate        || "",
          internshipCity: req.body.internshipCity || "",
          level:         level                   || "",
          field:         speciality              || "",
          average:       req.body.average        || "",
          rank:          req.body.rank           || "",
          branch:        branch                  || "",
          class:         level                   || "",
          templateType,
        },
        blockchainCertId: blockchainResult.blockchainCertId,
        contractType,
        type:      templateType,
        specialty: resolvedSpecialty,
        status:    "ACTIVE",
        issueDate: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: student.id },
      data: { isGraduated: true },
    });

    try {
      await sendEmail(
        student.email,
        "Your Certificate is Ready 🎓",
        `<h2>Congratulations ${student.fullName}!</h2>
        <p>Your certificate is now available on your dashboard.</p>
        <a href="${process.env.FRONTEND_URL}/login"
          style="display:inline-block;padding:12px 24px;background-color:#4F46E5;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px;">
          Login to Dashboard
        </a>`,
      );
    } catch (emailErr) {
      console.error(`Email failed for ${student.matricule}:`, emailErr.message);
    }

    res.status(201).json({ message: "Certificate issued successfully", uniqueCode });

  } catch (err) {
    console.error("[issueOne] ERROR:", err.message);
    res.status(500).json({ error: "An error occurred on the server", detail: err.message });
  }
};

const getStudents = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const { search, status } = req.query;

    const where = { role: "STUDENT" };
    if (status === "graduated")   where.isGraduated = true;
    if (status === "ungraduated") where.isGraduated = false;
    if (search) {
      where.OR = [
        { fullName:  { contains: search, mode: "insensitive" } },
        { matricule: { contains: search, mode: "insensitive" } },
        { email:     { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, students, graduated, withCerts] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          matricule: true,
          email: true,
          dateOfBirth: true,
          placeOfBirth: true,
          isGraduated: true,
          avatar: true,
          createdAt: true,
          _count: { select: { certificates: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.user.count({ where: { role: "STUDENT", isGraduated: true } }),
      prisma.user.count({ where: { role: "STUDENT", certificates: { some: {} } } }),
    ]);

    res.status(200).json({
      students,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      stats: { total, graduated, ungraduated: total - graduated, withCerts },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred on the server" });
  }
};

const getStudentCertificates = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, matricule: true, avatar: true },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const certificates = await prisma.certificate.findMany({
      where: { studentId: id },
      orderBy: { issueDate: "desc" },
    });

    res.status(200).json({ student, certificates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred on the server" });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.user.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.role !== "STUDENT") return res.status(403).json({ message: "Cannot delete non-student users" });

    const certs = await prisma.certificate.findMany({ where: { studentId: id }, select: { id: true } });
    const certIds = certs.map(c => c.id);
    if (certIds.length > 0) {
      await prisma.verification.deleteMany({ where: { certificateId: { in: certIds } } });
      await prisma.certificate.deleteMany({ where: { studentId: id } });
    }
    await prisma.request.deleteMany({ where: { studentId: id } });
    await prisma.user.delete({ where: { id } });

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
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
  getAuditStats,
  uploadAvatar,
  issueOne,
  getStudents,
  getStudentCertificates,
  deleteStudent,
};