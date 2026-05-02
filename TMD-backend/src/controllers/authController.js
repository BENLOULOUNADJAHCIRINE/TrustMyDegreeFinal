const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// login
const login = async (req, res) => {
  try {
    const { matricule, email, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          matricule ? { matricule } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean),
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "invalid password" });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        matricule: user.matricule,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong", error });
  }
};

// change password
const changePassword = async (req, res) => {
  try {
    const { matricule, email, currentPassword, newPassword } = req.body;

    // find by matricule  for student by mail for admins
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          matricule ? { matricule } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean),
      },
    });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error });
  }
};

// seed superadmin
const seedSuperAdmin = async (req, res) => {
  try {
    const existing = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (existing) {
      return res.status(400).json({ message: "Super Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash("superadmin123", 10);

    const superAdmin = await prisma.user.create({
      data: {
        fullName: "Super Admin",
        matricule: "SUPERADMIN",
        password: hashedPassword,
        role: "SUPER_ADMIN",
      },
    });

    res.json({ message: "Super Admin created successfully", superAdmin });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error });
  }
};
const getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatar: true,
      },
    });
    res.json({
      name: user.fullName,
      email: user.email,
      role: user.role,
      id: user.id,
      avatar: user.avatar,
    });
  } catch (err) {
    res.status(500).json({ message: "something went wrong" });
  }
};

// temporary in-memory store (use Redis in production)
const resetCodes = new Map();

// forgetpass function
const forgotPassword = async (req, res) => {
  try {
    const { matricule } = req.body;
    const user = await prisma.user.findUnique({ where: { matricule } });
    if (!user || !user.email)
      return res.status(404).json({ message: "Matricule not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    resetCodes.set(matricule, { code, expires, email: user.email });

    await transporter.sendMail({
      from: '"TrustMyDegree" <no-reply@ensta.dz>',
      to: user.email,
      subject: "Your Password Reset Code",
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:30px;border-radius:12px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Password Reset</h2>
          <p style="color:#64748b">Use this code to reset your password. It expires in 10 minutes.</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#2563eb;text-align:center;padding:20px 0">
            ${code}
          </div>
          <p style="color:#94a3b8;font-size:12px">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    const masked = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
    res.json({ message: "Code sent", maskedEmail: masked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// verify reset code
const verifyResetCode = (req, res) => {
  try {
    const { matricule, code } = req.body;
    const entry = resetCodes.get(matricule);

    if (!entry)
      return res
        .status(400)
        .json({ message: "No code requested for this matricule" });

    if (Date.now() > entry.expires) {
      resetCodes.delete(matricule);
      return res
        .status(400)
        .json({ message: "Code expired, please request a new one" });
    }

    if (entry.code !== code)
      return res.status(400).json({ message: "Invalid code" });

    res.json({ message: "Code verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// reset password
const resetPassword = async (req, res) => {
  try {
    const { matricule, code, newPassword } = req.body;
    const entry = resetCodes.get(matricule);

    if (!entry)
      return res
        .status(400)
        .json({ message: "No code requested for this matricule" });

    if (Date.now() > entry.expires) {
      resetCodes.delete(matricule);
      return res
        .status(400)
        .json({ message: "Code expired, please request a new one" });
    }

    if (entry.code !== code)
      return res.status(400).json({ message: "Invalid code" });

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { matricule },
      data: { password: hashed },
    });

    resetCodes.delete(matricule);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};
module.exports = {
  login,
  changePassword,
  seedSuperAdmin,
  getUser,
  forgotPassword,
  verifyResetCode,
  resetPassword,
};
