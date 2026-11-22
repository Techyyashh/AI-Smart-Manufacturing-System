const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  alertId: { type: Number, index: true },
  machineId: String,
  machineName: String,
  key: String,
  severity: String, // info | warning | critical
  category: String,
  message: String,
  active: Boolean,
  acknowledged: Boolean,
  raisedAt: Date,
  clearedAt: Date,
  acknowledgedAt: Date,
  acknowledgedBy: String,
});

module.exports = mongoose.model("Alert", alertSchema);
