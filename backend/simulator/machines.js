// ============================================================
// MACHINE CONFIGURATION
// Nominal (healthy) operating values for each machine on the shop floor.
// The simulator drifts around these values and the alert engine uses
// them to decide what is "abnormal" for each machine.
// ============================================================

module.exports = [
  {
    id: "M01",
    name: "CNC Mill A",
    type: "CNC Milling Centre",
    line: "Line 1 - Machining",
    nominal: {
      temperature: 72,   // °C spindle housing
      vibration: 2.8,    // mm/s RMS
      rpm: 8000,         // spindle speed
      load: 72,          // % of rated load
      pressure: 6.0,     // bar coolant pressure
      voltage: 415,      // V (3-phase)
      ratedPower: 15,    // kW
      powerFactor: 0.88,
      cycleTime: 45,     // seconds per part (ideal)
      qualityRate: 0.985,
    },
    pressureLabel: "Coolant pressure",
    serviceInterval: 500, // running hours between services
  },
  {
    id: "M02",
    name: "Lathe B",
    type: "CNC Lathe",
    line: "Line 1 - Machining",
    nominal: {
      temperature: 68, vibration: 3.1, rpm: 2500, load: 68, pressure: 5.0,
      voltage: 415, ratedPower: 11, powerFactor: 0.87, cycleTime: 38, qualityRate: 0.988,
    },
    pressureLabel: "Coolant pressure",
    serviceInterval: 500,
  },
  {
    id: "M03",
    name: "Press C",
    type: "Hydraulic Press",
    line: "Line 2 - Forming",
    nominal: {
      temperature: 61, vibration: 4.2, rpm: 1450, load: 78, pressure: 180,
      voltage: 415, ratedPower: 22, powerFactor: 0.85, cycleTime: 12, qualityRate: 0.992,
    },
    pressureLabel: "Hydraulic pressure",
    serviceInterval: 400,
  },
  {
    id: "M04",
    name: "Conveyor D",
    type: "Belt Conveyor",
    line: "Line 2 - Forming",
    nominal: {
      temperature: 45, vibration: 1.8, rpm: 1440, load: 55, pressure: 6.0,
      voltage: 415, ratedPower: 3, powerFactor: 0.82, cycleTime: 6, qualityRate: 0.999,
    },
    pressureLabel: "Pneumatic pressure",
    serviceInterval: 800,
  },
  {
    id: "M05",
    name: "Welder E",
    type: "Robotic Arc Welder",
    line: "Line 3 - Assembly",
    nominal: {
      temperature: 95, vibration: 2.1, rpm: 2800, load: 65, pressure: 1.5,
      voltage: 415, ratedPower: 18, powerFactor: 0.8, cycleTime: 30, qualityRate: 0.975,
    },
    pressureLabel: "Shielding gas pressure",
    serviceInterval: 450,
  },
  {
    id: "M06",
    name: "Grinder F",
    type: "Surface Grinder",
    line: "Line 3 - Assembly",
    nominal: {
      temperature: 78, vibration: 5.1, rpm: 3000, load: 70, pressure: 4.0,
      voltage: 415, ratedPower: 7.5, powerFactor: 0.86, cycleTime: 25, qualityRate: 0.98,
    },
    pressureLabel: "Coolant pressure",
    serviceInterval: 450,
  },
];
