const prisma = require('../config/prisma');
const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  host : process.env.EMAIL_HOST,
  port : process.env.EMAIL_PORT,
  auth :{
        
    user : process.env.EMAIL_USER,
    pass : process.env.EMAIL_PASS,
  },
});

const submitContact = async (req, res) => {
  try {
    const { name, email, phone, institution, message, agreedToPolicy} = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

     if (!agreedToPolicy) {
      return res.status(400).json({ message: 'You must agree to the privacy policy' });
    }

    // save to the contact table in database 
    const contact = await prisma.contact.create({
      data: {name, email, phone, institution, message, agreedToPolicy}
    });

    // notify that a contact is send and reply
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `New Contact Message from ${name}`,
      text: `
      Name: ${name}
      Email: ${email}
      Phone: ${phone || 'N/A'}
     Institution: ${institution || 'N/A'}
    Message: ${message}
      `,
    });
    


    res.json({ message: 'Message sent successfully', contact });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error });
  }
};

module.exports = { submitContact };