const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

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
      },
    });
  } catch (error) {
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
      select: { id: true, fullName: true, email: true, role: true },
    });
    res.json({
      name: user.fullName,
      email: user.email,
      role: user.role,
      id: user.id,
    });
  } catch (err) {
    res.status(500).json({ message: "something went wrong" });
  }
};
module.exports = { login, changePassword, seedSuperAdmin, getUser };
