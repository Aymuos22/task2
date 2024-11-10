const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  ipAddress: String,
  userAgent: String,
  lastUsed: Date,
});

module.exports = mongoose.model('Device', DeviceSchema);
