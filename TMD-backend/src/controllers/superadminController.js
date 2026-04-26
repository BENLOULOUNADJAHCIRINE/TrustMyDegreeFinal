const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
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
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error });
  }
};
//create admin
const createAdmin = async (req, res) => {
  try {
    const {email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

      const existing = await prisma.user.findUnique({ where: {email} });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your TrustMyDegree Admin Account',
      html: `
        <h2>Welcome to TrustMyDegree</h2>
        <p>Your admin account has been created successfully.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${randomPassword}</p>
        <p>Please login and change your password as soon as possible.</p>
        <br/>
        <p>TrustMyDegree Team</p>
      `,
    });

    res.status(201).json({ message: 'Admin created , data to email' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error });
  }
};

//delete admin
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await prisma.user.findUnique({ where: { id } });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.role !== 'ADMIN') {
      return res.status(400).json({ message: 'user is not an admin' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error });
  }
};

module.exports = { getAdmins, createAdmin, deleteAdmin };