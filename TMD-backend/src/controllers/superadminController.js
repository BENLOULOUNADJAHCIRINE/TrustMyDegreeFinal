const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const prisma = require("../config/prisma");

//for email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
//get all admins
const getAdmins = async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error });
  }
};
//create admin
const createAdmin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const newAdmin = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: "Your TrustMyDegree Admin Account",
        html: `
          <h2>Welcome to TrustMyDegree</h2>
          <p>Your admin account has been created successfully.</p>
          <p><strong>Email:</strong> ${normalizedEmail}</p>
          <p><strong>Password:</strong> ${randomPassword}</p>
          <p>Please login and change your password as soon as possible.</p>
          <br/>
          <p>TrustMyDegree Team</p>
        `,
      });
    } catch (emailError) {
      console.error("Email send failed:", emailError.message);

      return res.status(201).json({
        message: "Admin created but email failed to send",
        adminId: newAdmin.id,
        emailError: emailError.message,
      });
    }

    res.status(201).json({
      message: "Admin created, credentials sent to email",
      adminId: newAdmin.id,
    });
  } catch (error) {
    console.error("createAdmin error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};
//delete admin
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await prisma.user.findUnique({ where: { id } });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    if (admin.role !== "ADMIN") {
      return res.status(400).json({ message: "User is not an admin" });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("deleteAdmin error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};
x;

module.exports = { getAdmins, createAdmin, deleteAdmin };
