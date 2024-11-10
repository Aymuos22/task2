const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const OTP = require('../models/OTP');
const User = require('../models/User');
const Device = require('../models/Device');
require('dotenv').config();

const router = express.Router();

// Configure nodemailer for sending OTP emails
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Function to generate and send OTP
async function sendOtpToUser(userId, email) {
  const otp = uuidv4().slice(0, 6); // Generate a 6-character OTP
  const otpDoc = new OTP({
    otp,
    userId,
    expiresAt: new Date(Date.now() + 5 * 60000), // Set OTP expiry to 5 minutes from now
  });
  await otpDoc.save();

  // Send OTP email
  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
  });
  return otp;
}

// Login route with device recognition
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  // Validate user and password
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Check if device is already recognized
    const device = await Device.findOne({
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!device) {
      // If device is unrecognized, send OTP
      await sendOtpToUser(user._id, user.email);
      return res.json({ otpRequired: true, message: 'OTP sent to your email' });
    }

    // Update device's last used timestamp and proceed with login
    device.lastUsed = new Date();
    await device.save();
    return res.json({ token, message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Verify OTP route
router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;
  const otpDoc = await OTP.findOne({ userId, otp });

  // Check if OTP is valid and not expired
  if (otpDoc && otpDoc.expiresAt > new Date()) {
    // Register the new device in the devices collection
    const device = new Device({
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      lastUsed: new Date(),
    });
    await device.save();

    // Remove OTP entry after successful verification
    await OTP.deleteOne({ _id: otpDoc._id });

    // Generate a new JWT token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, message: 'OTP verified. Login successful' });
  } else {
    res.status(400).json({ message: 'OTP expired or invalid' });
  }
});

module.exports = router;
