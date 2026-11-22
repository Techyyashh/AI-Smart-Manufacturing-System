const mongoose = require("mongoose");

const maintenanceLogSchema = new mongoose.Schema({
  logId: { type: String, index: true },
  machineId: String,
  machineName: String,
  type: String, // Preventive | Corrective
  reason: String,
  note: String,
  startedBy: String,
  actions: [String],
  hoursAtService: Number,
  hoursSinceLastService: Number,
  durationMin: Number,
  status: String,
  startedAt: Date,
  completedAt: Date,
});

module.exports = mongoose.model("MaintenanceLog", maintenanceLogSchema);
