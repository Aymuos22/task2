const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  otp: String,
  userId: mongoose.Schema.Types.ObjectId,
  expiresAt: Date,
});

module.exports = mongoose.model('OTP', OTPSchema);
