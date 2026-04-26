const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const QRCode = require("qrcode");

const generateDiplomaPDF = async (studentData, templateType = "diploma") => {
  let templateName = "certificate.html";
  if (templateType === "scolarite")  templateName = "scolarite.html";
  if (templateType === "internship") templateName = "internship.html";
  if (templateType === "rank")       templateName = "rank.html"; // ✅ added

  const templatePath = path.join(__dirname, "../templates", templateName);
  let html = fs.readFileSync(templatePath, "utf8");

  const verifyUrl = `http://localhost:3000/verify?code=${studentData.uniqueCode}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 120,
    margin: 1,
    color: { dark: "#1a3466", light: "#ffffff" },
  });

  html = html.replace(
    /{{qrCode}}/g,
    `<img src="${qrCodeDataUrl}" width="44" height="44" style="display:block;" />`
  );

  const replace = (key, value) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), value ?? "");
  };

  replace("fullName",       studentData.fullName);
  replace("matricule",      studentData.matricule);
  replace("specialty",      studentData.specialty);
  replace("faculty",        studentData.faculty);
  replace("mention",        studentData.mention);
  replace("issueDate",      studentData.issueDate);
  replace("graduationDate", studentData.graduationDate);
  replace("startDate",      studentData.startDate);
  replace("endDate",        studentData.endDate);
  replace("academicYear",   studentData.academicYear);
  replace("year",           studentData.year);
  replace("sectionNum",     studentData.sectionNum);
  replace("facultyNum",     studentData.facultyNum);
  replace("company",        studentData.company);
  replace("duration",       studentData.duration);
  replace("field",          studentData.field);
  replace("level",          studentData.level);
  replace("internshipCity", studentData.internshipCity);
  replace("birthDate",      studentData.birthDate);
  replace("birthPlace",     studentData.birthPlace);
  replace("average",        studentData.average);  // ✅ for rank template
  replace("rank",           studentData.rank);     // ✅ for rank template
  replace("branch",         studentData.branch);   // ✅ for rank template
  replace("class",          studentData.class);    // ✅ for rank template
  replace("hash",           studentData.hash ?? studentData.uniqueCode);
  replace("uniqueCode",     studentData.uniqueCode);

  const uploadsDir = path.join(__dirname, "../../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.addStyleTag({
      content: `
        body {
          padding: 0 !important;
          margin: 0 !important;
          background: white !important;
          display: block !important;
          min-height: unset !important;
        }
        .diploma {
          box-shadow: none !important;
          margin: 0 !important;
        }
      `
    });

    const fileName = `diploma_${studentData.uniqueCode}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    await page.pdf({
      path: filePath,
      width: "1050px",
      height: "742px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return `uploads/${fileName}`;
  } finally {
    await browser.close();
  }
};

module.exports = generateDiplomaPDF;