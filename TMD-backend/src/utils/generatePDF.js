const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const generateDiplomaPDF = async (studentData, templateType = "diploma") => {
  // choose template based on type
  let templateName = "certificate.html"; // default diploma
  if (templateType === "scolarite") templateName = "scolarite.html";
  if (templateType === "internship") templateName = "internship.html";

  const templatePath = path.join(__dirname, "../templates", templateName);
  let html = fs.readFileSync(templatePath, "utf8");

  // replace common fields
  html = html.replace(/{{fullName}}/g, studentData.fullName || "");
  html = html.replace(/{{matricule}}/g, studentData.matricule || "");
  html = html.replace(/{{specialty}}/g, studentData.specialty || "");
  html = html.replace(/{{faculty}}/g, studentData.faculty || "");
  html = html.replace(/{{mention}}/g, studentData.mention || "");
  html = html.replace(/{{issueDate}}/g, studentData.issueDate || "");
  html = html.replace(/{{uniqueCode}}/g, studentData.uniqueCode || "");
  html = html.replace(/{{graduationDate}}/g, studentData.graduationDate || "");

  // scolarite specific fields
  html = html.replace(/{{academicYear}}/g, studentData.academicYear || "");
  html = html.replace(/{{year}}/g, studentData.year || "");

  // internship specific fields
  html = html.replace(/{{company}}/g, studentData.company || "");
  html = html.replace(/{{duration}}/g, studentData.duration || "");
  html = html.replace(/{{startDate}}/g, studentData.startDate || "");

  // original diploma fields
  html = html.replace(/{{sectionNum}}/g, studentData.sectionNum || "");
  html = html.replace(/{{facultyNum}}/g, studentData.facultyNum || "");

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const fileName = `diploma_${studentData.uniqueCode}.pdf`;
  const filePath = path.join(__dirname, "../../uploads", fileName);

  await page.pdf({
    path: filePath,
    width: "1050px",
    height: "742px",
    printBackground: true,
  });

  await browser.close();
  return `uploads/${fileName}`;
};

module.exports = generateDiplomaPDF;