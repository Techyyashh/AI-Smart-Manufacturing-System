const mongoose = require("mongoose");

// One stored sensor snapshot of one machine (saved every 10 seconds)
const machineSchema = new mongoose.Schema({
  machineId: { type: String, index: true },

  machineName: {
    type: String,
    required: true,
  },

  state: String,
  status: String,

  // mechanical
  temperature: Number,
  vibration: Number,
  rpm: Number,
  load: Number,
  pressure: Number,
  oilLevel: Number,

  // electrical
  voltage: Number,
  current: Number,
  power: Number,
  powerFactor: Number,
  energyKWh: Number,

  // production
  parts: Number,
  rejects: Number,
  oee: Number,
  efficiency: Number,

  // condition
  health: Number,
  failureProbability: Number,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model("Machine", machineSchema);
