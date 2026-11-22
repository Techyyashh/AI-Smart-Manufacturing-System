// ============================================================
// PLANT SIMULATOR (IoT data source)
// Simulates six industrial machines with realistic behaviour:
//   - Mechanical: temperature, vibration, RPM, load, pressure, lubricant
//   - Electrical: voltage, current, power, power factor, energy, cost
//   - Production: parts, rejects, cycle time, OEE (A x P x Q), downtime
//   - Maintenance: running hours, wear, service due, remaining useful life
// Machines wear over time, go idle, develop faults that degrade
// gradually, and trip when limits are exceeded. A maintenance action
// restores them.
//
// Live sensor values update every second in real time. Counters
// (hours, energy, parts) advance SIM_SPEED times faster so a demo
// shows a full shift in a few minutes. Set SIM_SPEED=1 for real time.
//
// To connect real sensors later, replace tickMachine() with readings
// from MQTT / OPC UA / Modbus - the rest of the system stays the same.
// ============================================================
const EventEmitter = require("events");

const MACHINES = require("./machines");
const aiClient = require("./aiClient");
const AlertEngine = require("./alertEngine");

const TICK_MS = 1000;
const SIM_SPEED = Number(process.env.SIM_SPEED) || 60;
const TARIFF = Number(process.env.ENERGY_TARIFF) || 8; // ₹ per kWh
const AMBIENT = 28; // °C
const HISTORY_POINTS = 300; // per machine, 1 per second (5 minutes)
const SNAPSHOT_EVERY = 10; // ticks between stored snapshots
const SQRT3 = Math.sqrt(3);

// Starting condition of each machine, so the demo shows variety
const START = {
  M01: { wear: 0.35, oil: 78 },
  M02: { wear: 0.22, oil: 31 },
  M03: { wear: 0.58, oil: 85 },
  M04: { wear: 0.12, oil: 92 },
  M05: { wear: 0.48, oil: 66 },
  M06: { wear: 0.86, oil: 54 },
};

const FAULT_MODES = {
  overheat:   { label: "Overheating", diagnosis: "Cooling system degradation - rising temperature" },
  bearing:    { label: "Bearing wear", diagnosis: "Bearing wear - rising vibration and temperature" },
  electrical: { label: "Electrical fault", diagnosis: "Motor winding / supply fault - high current, low power factor" },
  pressure:   { label: "Pressure leak", diagnosis: "Leak in pressure line - pressure falling" },
};

const IDLE_REASONS = ["Waiting for material", "Tool change", "Operator break", "Setup / changeover"];

const gauss = (mean = 0, std = 1) => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

function createMachine(cfg) {
  const n = cfg.nominal;
  const s = START[cfg.id] || { wear: 0.3, oil: 80 };
  return {
    cfg,
    state: "RUNNING",
    stateReason: "Producing",
    stateSince: Date.now(),
    idleUntil: 0,
    maintenance: null, // { type, until, entry }

    // live sensors
    temperature: n.temperature,
    vibration: n.vibration,
    rpm: n.rpm,
    load: n.load,
    pressure: n.pressure,
    oilLevel: s.oil,
    voltage: n.voltage,
    current: 0,
    power: 0,
    powerFactor: n.powerFactor,

    // condition
    wear: s.wear,
    hoursSinceService: s.wear * cfg.serviceInterval,
    totalHours: 3000 + Math.round(Math.random() * 6000),
    faultMode: null,
    faultSeverity: 0,
    faultRate: 0,
    tripTicks: 0,
    diagnosis: null,

    // production (shift counters)
    parts: 0, good: 0, rejects: 0, partAcc: 0,
    cycleTime: n.cycleTime,
    runSec: 0, idleSec: 0, downSec: 0, plannedSec: 0,
    energyKWh: 0,

    // derived
    health: 100,
    failureProbability: 0.02,
    aiSource: "estimate",
    rulHours: 0,
    serviceDueHours: 0,
    efficiency: 100,

    history: [],
  };
}

class PlantSimulator extends EventEmitter {
  constructor() {
    super();
    this.machines = MACHINES.map(createMachine);
    this.alertEngine = new AlertEngine((alert) => this.emit("alert", alert));
    this.maintenanceLog = [];
    this.recentReadings = []; // in-memory history when no database
    this.tickCount = 0;
    this.shiftStart = Date.now();
    this.simElapsedSec = 0;
    this.timer = null;
  }

  start() {
    // Warm up so charts and counters have data from the first second
    for (let i = 0; i < 120; i++) this.tick(true);
    this.timer = setInterval(() => this.tick(false), TICK_MS);
    console.log(`Plant simulator running: ${this.machines.length} machines, ${SIM_SPEED}x counter speed`);
  }

  stop() {
    clearInterval(this.timer);
  }

  getMachine(id) {
    return this.machines.find((m) => m.cfg.id === id);
  }

  // ----------------------------------------------------------
  // ONE TICK (1 second)
  // ----------------------------------------------------------
  tick(warmup) {
    this.tickCount++;
    const dtSim = SIM_SPEED; // simulated seconds per tick
    this.simElapsedSec += dtSim;
    const now = warmup ? Date.now() - (120 - this.tickCount) * TICK_MS : Date.now();

    this.machines.forEach((m) => this.tickMachine(m, dtSim, warmup));

    // AI prediction every 2 ticks (non-blocking)
    if (!warmup && this.tickCount % 2 === 0) this.requestPredictions();

    this.machines.forEach((m) => {
      m.history.push({
        t: now,
        temperature: round(m.temperature, 1),
        vibration: round(m.vibration, 2),
        rpm: Math.round(m.rpm),
        load: round(m.load, 1),
        power: round(m.power, 2),
        current: round(m.current, 1),
        voltage: round(m.voltage, 1),
        pressure: round(m.pressure, 2),
        health: round(m.health, 1),
        failureProbability: round(m.failureProbability, 3),
      });
      if (m.history.length > HISTORY_POINTS) m.history.shift();
    });

    if (!warmup) {
      this.alertEngine.update(this.machines);
      if (this.tickCount % SNAPSHOT_EVERY === 0) this.storeSnapshot();
      this.emit("tick", this.snapshot());
    }
  }

  tickMachine(m, dtSim, warmup) {
    const n = m.cfg.nominal;
    const dtH = dtSim / 3600;
    m.plannedSec += dtSim;

    // ---------- state transitions ----------
    if (m.state === "MAINTENANCE" && Date.now() >= m.maintenance.until && !warmup) {
      this.completeMaintenance(m);
    }
    if (m.state === "IDLE" && Date.now() >= m.idleUntil) {
      this.setState(m, "RUNNING", "Producing");
    }
    if (m.state === "RUNNING" && !warmup) {
      if (!m.faultMode && Math.random() < 0.004) {
        this.setState(m, "IDLE", IDLE_REASONS[Math.floor(Math.random() * IDLE_REASONS.length)]);
        m.idleUntil = Date.now() + (8 + Math.random() * 12) * 1000;
      }
      // Worn machines start developing faults on their own
      const faultChance = m.wear > 1 ? 0.003 : m.wear > 0.9 ? 0.0008 : 0.00005;
      if (!m.faultMode && Math.random() < faultChance) {
        const modes = Object.keys(FAULT_MODES);
        this.injectFault(m, modes[Math.floor(Math.random() * modes.length)], false);
      }
    }

    // fault slowly gets worse while the machine keeps running
    if (m.faultMode && m.state === "RUNNING") {
      m.faultSeverity = Math.min(1.2, m.faultSeverity + m.faultRate);
    }
    const s = m.faultSeverity;
    const f = m.faultMode;
    m.diagnosis = f && s > 0.3 ? FAULT_MODES[f].diagnosis : m.state === "FAULT" && f ? FAULT_MODES[f].diagnosis : null;

    // ---------- physics ----------
    if (m.state === "RUNNING") {
      m.load = clamp(m.load + 0.15 * (n.load - m.load) + gauss(0, 2.5), 25, 100);

      const rpmTarget = n.rpm * (0.95 + 0.05 * (m.load / 100)) * (f === "bearing" ? 1 - 0.05 * s : 1);
      m.rpm = m.rpm + 0.3 * (rpmTarget - m.rpm) + gauss(0, n.rpm * 0.003);

      const tempAdd = f === "overheat" ? 50 * s : f === "bearing" ? 14 * s : f === "electrical" ? 12 * s : f === "pressure" ? 8 * s : 0;
      const tempTarget = AMBIENT + (n.temperature - AMBIENT) * (0.75 + 0.35 * (m.load / 100)) * (1 + 0.12 * m.wear) + tempAdd;
      m.temperature += 0.12 * (tempTarget - m.temperature) + gauss(0, 0.35);

      const vibMul = f === "bearing" ? 1 + 3.2 * s : 1;
      m.vibration = Math.max(0.2, n.vibration * (0.85 + 0.2 * (m.load / 100)) * (1 + 0.8 * m.wear * m.wear) * vibMul + gauss(0, n.vibration * 0.05));
      if (Math.random() < 0.01) m.vibration *= 1.4; // short mechanical shock

      const pressureMul = f === "pressure" ? 1 - 0.45 * s : 1;
      m.pressure = Math.max(0, n.pressure * (1 + gauss(0, 0.015)) * pressureMul * (m.oilLevel < 15 ? 0.9 : 1));

      m.oilLevel = Math.max(0, m.oilLevel - dtH * 0.08);

      const vDip = f === "electrical" ? 28 * s : 0;
      m.voltage = n.voltage * (1 + gauss(0, 0.005)) - vDip - (Math.random() < 0.005 ? 15 : 0);
      m.powerFactor = clamp(n.powerFactor - (f === "electrical" ? 0.18 * s : 0) + gauss(0, 0.004), 0.5, 0.99);
      m.power = n.ratedPower * (0.25 + 0.75 * (m.load / 100)) * (1 + 0.1 * m.wear) * (f === "electrical" ? 1 + 0.2 * s : 1);

      // production
      m.cycleTime = n.cycleTime * (1 + 0.15 * m.wear) * (1 + (n.load - m.load) / 250) * (f === "bearing" ? 1 + 0.2 * s : 1);
      m.partAcc += dtSim / m.cycleTime;
      const rejectProb = (1 - n.qualityRate) + 0.04 * m.wear + (f ? 0.06 * s : 0);
      while (m.partAcc >= 1) {
        m.partAcc -= 1;
        m.parts++;
        if (Math.random() < rejectProb) m.rejects++; else m.good++;
      }
      m.runSec += dtSim;
      m.efficiency = clamp((n.cycleTime / m.cycleTime) * 100, 0, 100);

      // condition
      m.hoursSinceService += dtH;
      m.totalHours += dtH;
      m.wear = Math.min(1.25, m.wear + (dtH / m.cfg.serviceInterval) * (0.7 + 0.5 * (m.load / 100)));

      // trip protection
      const trip =
        m.temperature > n.temperature + 45 ||
        m.vibration > n.vibration * 4.5 ||
        (f === "electrical" && s >= 1) ||
        (f === "pressure" && s >= 1);
      // protection only trips on a sustained condition, not a single spike
      m.tripTicks = trip ? m.tripTicks + 1 : 0;
      if (m.tripTicks >= 3 && !warmup) {
        m.tripTicks = 0;
        this.setState(m, "FAULT", f ? FAULT_MODES[f].label : "Protection trip");
      }
    } else {
      // IDLE / FAULT / MAINTENANCE - machine is not producing
      const idle = m.state === "IDLE";
      m.load = Math.max(0, m.load * 0.6);
      m.rpm = Math.max(0, m.rpm * 0.6);
      const coolTarget = AMBIENT + (idle ? (n.temperature - AMBIENT) * 0.35 : 0);
      m.temperature += 0.05 * (coolTarget - m.temperature) + gauss(0, 0.2);
      m.vibration = Math.max(0.05, n.vibration * (idle ? 0.12 : 0.03) + gauss(0, 0.02));
      m.pressure = idle ? n.pressure * (1 + gauss(0, 0.01)) : Math.max(0, m.pressure * 0.8);
      m.voltage = n.voltage * (1 + gauss(0, 0.004));
      m.powerFactor = clamp(n.powerFactor - 0.25 + gauss(0, 0.005), 0.4, 0.99);
      m.power = n.ratedPower * (idle ? 0.12 : 0.02);
      m.efficiency = 0;
      if (idle) m.idleSec += dtSim; else m.downSec += dtSim;
    }

    m.current = (m.power * 1000) / (SQRT3 * m.voltage * m.powerFactor);
    m.energyKWh += m.power * dtH;

    // ---------- health, RUL, service ----------
    const tScore = clamp((m.temperature - n.temperature) / 35, 0, 1);
    const vScore = m.state === "RUNNING" ? clamp((m.vibration / n.vibration - 1) / 2.5, 0, 1) : 0;
    const oScore = clamp((30 - m.oilLevel) / 30, 0, 1);
    const eScore = m.state === "RUNNING"
      ? clamp((n.powerFactor - m.powerFactor) / 0.15 + Math.abs(m.voltage - n.voltage) / n.voltage / 0.08, 0, 1)
      : 0;
    let health = 100 * (1 - 0.25 * tScore - 0.25 * vScore - 0.3 * Math.min(m.wear, 1) - 0.1 * oScore - 0.1 * eScore);
    if (m.state === "FAULT") health = Math.min(health, 20);
    m.health = clamp(health, 0, 100);

    const wearRate = (0.7 + 0.5 * (n.load / 100)) / m.cfg.serviceInterval; // per hour
    let rul = Math.max(0, (1.1 - m.wear) / wearRate);
    if (f) rul *= Math.max(0, 1 - s);
    if (m.state === "FAULT") rul = 0;
    m.rulHours = rul;
    m.serviceDueHours = m.cfg.serviceInterval - m.hoursSinceService;

    // rule-based failure probability, replaced by the AI model when online
    if (m.state === "FAULT") {
      m.failureProbability = 1;
    } else if (m.state === "MAINTENANCE") {
      m.failureProbability = 0;
    } else if (!aiClient.online || m.state !== "RUNNING") {
      const est = 1 / (1 + Math.exp((m.health - 45) / 8));
      m.failureProbability = m.failureProbability * 0.6 + est * 0.4;
      m.aiSource = "estimate";
    }
  }

  // Features in the same scale as the training data (dataset.csv)
  modelFeatures(m) {
    const n = m.cfg.nominal;
    return {
      temperature: 65 + (m.temperature - n.temperature),
      vibration: 2.5 * (m.vibration / n.vibration),
      efficiency: m.efficiency - 8,
    };
  }

  async requestPredictions() {
    const running = this.machines.filter((m) => m.state === "RUNNING");
    if (running.length === 0) return;
    const preds = await aiClient.predictBatch(running.map((m) => this.modelFeatures(m)));
    if (!preds) return;
    preds.forEach((p, i) => {
      const m = running[i];
      if (m.state !== "RUNNING") return;
      m.failureProbability = m.failureProbability * 0.6 + p.probability * 0.4; // smooth
      m.aiSource = "model";
    });
  }

  setState(m, state, reason) {
    if (m.state === state && m.stateReason === reason) return;
    const prev = m.state;
    m.state = state;
    m.stateReason = reason;
    m.stateSince = Date.now();
    if (state === "FAULT") {
      this.alertEngine.info(m, `${m.cfg.name} stopped: ${reason}`, "State");
    } else if (state === "IDLE") {
      this.alertEngine.info(m, `${m.cfg.name} idle: ${reason}`, "State");
    } else if (state === "RUNNING" && prev !== "RUNNING") {
      this.alertEngine.info(m, `${m.cfg.name} back in production`, "State");
    }
  }

  // ----------------------------------------------------------
  // COMMANDS
  // ----------------------------------------------------------
  injectFault(m, mode, manual = true, by = "") {
    if (!FAULT_MODES[mode]) throw new Error(`Unknown fault mode. Use: ${Object.keys(FAULT_MODES).join(", ")}`);
    if (m.state !== "RUNNING") throw new Error(`${m.cfg.name} is not running (state: ${m.state})`);
    if (m.faultMode) throw new Error(`${m.cfg.name} already has a developing fault`);
    m.faultMode = mode;
    m.faultSeverity = 0.05;
    // demo faults develop in ~30 s; natural faults take ~2 minutes, giving time to react
    m.faultRate = manual ? 0.03 : 0.008;
    if (manual) this.alertEngine.info(m, `Demo: ${FAULT_MODES[mode].label} fault injected on ${m.cfg.name}${by ? ` by ${by}` : ""}`, "Demo");
  }

  startMaintenance(m, type = "Preventive", note = "", by = "") {
    if (m.state === "MAINTENANCE") throw new Error(`${m.cfg.name} is already under maintenance`);
    const corrective = type === "Corrective" || m.state === "FAULT";
    const realSec = corrective ? 25 : 15;
    const entry = {
      id: `${m.cfg.id}-${Date.now()}`,
      machineId: m.cfg.id,
      machineName: m.cfg.name,
      type: corrective ? "Corrective" : "Preventive",
      reason: m.diagnosis || (m.state === "FAULT" ? m.stateReason : "Scheduled preventive service"),
      note,
      startedBy: by,
      hoursAtService: round(m.totalHours, 1),
      hoursSinceLastService: round(m.hoursSinceService, 1),
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMin: round((realSec * SIM_SPEED) / 60, 0),
      status: "In progress",
    };
    m.maintenance = { type: entry.type, until: Date.now() + realSec * 1000, entry };
    this.maintenanceLog.unshift(entry);
    this.setState(m, "MAINTENANCE", `${entry.type} maintenance`);
    this.alertEngine.info(m, `${entry.type} maintenance started on ${m.cfg.name}${by ? ` by ${by}` : ""}`, "Maintenance");
    this.emit("maintenance", entry);
    return entry;
  }

  completeMaintenance(m) {
    const entry = m.maintenance.entry;
    entry.completedAt = new Date().toISOString();
    entry.status = "Completed";
    entry.actions = [
      m.faultMode ? `Repaired: ${FAULT_MODES[m.faultMode].label.toLowerCase()}` : null,
      "Lubricant topped up",
      "Inspection and calibration",
      m.wear > 0.5 ? "Worn parts replaced" : null,
    ].filter(Boolean);
    m.wear = 0.02;
    m.hoursSinceService = 0;
    m.oilLevel = 100;
    m.faultMode = null;
    m.faultSeverity = 0;
    m.diagnosis = null;
    m.maintenance = null;
    m.temperature = AMBIENT + 10;
    this.setState(m, "RUNNING", "Producing");
    this.alertEngine.info(m, `Maintenance completed on ${m.cfg.name} - machine back in service`, "Maintenance");
    this.emit("maintenance", entry);
  }

  resetShift(by = "") {
    this.machines.forEach((m) => {
      Object.assign(m, { parts: 0, good: 0, rejects: 0, partAcc: 0, runSec: 0, idleSec: 0, downSec: 0, plannedSec: 0, energyKWh: 0 });
    });
    this.shiftStart = Date.now();
    this.simElapsedSec = 0;
    this.alertEngine.info(null, `New shift started - production counters reset${by ? ` by ${by}` : ""}`, "Shift");
  }

  // ----------------------------------------------------------
  // DATA OUT
  // ----------------------------------------------------------
  machineSummary(m) {
    const n = m.cfg.nominal;
    const runSec = Math.max(m.runSec, 1);
    const availability = m.plannedSec > 0 ? m.runSec / m.plannedSec : 0;
    const performance = m.runSec > 0 ? clamp((n.cycleTime * m.parts) / runSec, 0, 1) : 0;
    const quality = m.parts > 0 ? m.good / m.parts : 1;
    return {
      id: m.cfg.id,
      state: m.state,
      stateReason: m.stateReason,
      stateSince: m.stateSince,
      maintenanceUntil: m.maintenance ? m.maintenance.until : null,
      // mechanical
      temperature: round(m.temperature, 1),
      vibration: round(m.vibration, 2),
      rpm: Math.round(m.rpm),
      load: round(m.load, 1),
      pressure: round(m.pressure, 2),
      oilLevel: round(m.oilLevel, 1),
      // electrical
      voltage: round(m.voltage, 1),
      current: round(m.current, 1),
      power: round(m.power, 2),
      powerFactor: round(m.powerFactor, 3),
      energyKWh: round(m.energyKWh, 1),
      energyCost: round(m.energyKWh * TARIFF, 0),
      // production
      parts: m.parts,
      good: m.good,
      rejects: m.rejects,
      cycleTime: round(m.cycleTime, 1),
      availability: round(availability, 4),
      performance: round(performance, 4),
      quality: round(quality, 4),
      oee: round(availability * performance * quality, 4),
      runMin: round(m.runSec / 60, 0),
      idleMin: round(m.idleSec / 60, 0),
      downtimeMin: round(m.downSec / 60, 0),
      // maintenance & condition
      totalHours: round(m.totalHours, 1),
      hoursSinceService: round(m.hoursSinceService, 1),
      serviceDueHours: round(m.serviceDueHours, 1),
      wear: round(m.wear, 3),
      rulHours: round(m.rulHours, 0),
      health: round(m.health, 1),
      failureProbability: round(m.failureProbability, 3),
      aiSource: m.aiSource,
      diagnosis: m.diagnosis,
      efficiency: round(m.efficiency, 1),
    };
  }

  plantSummary(machines) {
    const sum = (k) => machines.reduce((a, m) => a + m[k], 0);
    const parts = sum("parts");
    const good = sum("good");
    const running = machines.filter((m) => m.state === "RUNNING").length;
    return {
      machinesTotal: machines.length,
      running,
      idle: machines.filter((m) => m.state === "IDLE").length,
      fault: machines.filter((m) => m.state === "FAULT").length,
      maintenance: machines.filter((m) => m.state === "MAINTENANCE").length,
      totalPower: round(sum("power"), 1),
      energyKWh: round(sum("energyKWh"), 1),
      energyCost: round(sum("energyCost"), 0),
      parts,
      good,
      rejects: sum("rejects"),
      oee: round(sum("oee") / machines.length, 4),
      availability: round(sum("availability") / machines.length, 4),
      performance: round(sum("performance") / machines.length, 4),
      quality: parts > 0 ? round(good / parts, 4) : 1,
      avgHealth: round(sum("health") / machines.length, 1),
      downtimeMin: sum("downtimeMin"),
      shiftHours: round(this.simElapsedSec / 3600, 2),
      alerts: this.alertEngine.counts(),
      ai: { online: aiClient.online },
    };
  }

  snapshot() {
    const machines = this.machines.map((m) => this.machineSummary(m));
    return {
      ts: Date.now(),
      plant: this.plantSummary(machines),
      machines,
    };
  }

  config() {
    return {
      simSpeed: SIM_SPEED,
      tariff: TARIFF,
      tickMs: TICK_MS,
      faultModes: Object.entries(FAULT_MODES).map(([key, v]) => ({ key, label: v.label })),
      machines: this.machines.map((m) => ({
        id: m.cfg.id, name: m.cfg.name, type: m.cfg.type, line: m.cfg.line,
        nominal: m.cfg.nominal, pressureLabel: m.cfg.pressureLabel, serviceInterval: m.cfg.serviceInterval,
      })),
    };
  }

  initPayload(historyPoints = 120) {
    return {
      config: this.config(),
      ...this.snapshot(),
      history: Object.fromEntries(this.machines.map((m) => [m.cfg.id, m.history.slice(-historyPoints)])),
      alerts: this.alertEngine.alerts.slice(0, 100),
      maintenanceLog: this.maintenanceLog.slice(0, 50),
      modelInfo: aiClient.modelInfo,
    };
  }

  storeSnapshot() {
    const time = new Date().toISOString();
    const records = this.machines.map((m) => {
      const s = this.machineSummary(m);
      return {
        machineId: m.cfg.id,
        machineName: m.cfg.name,
        createdAt: time,
        state: s.state,
        temperature: s.temperature,
        vibration: s.vibration,
        rpm: s.rpm,
        load: s.load,
        pressure: s.pressure,
        oilLevel: s.oilLevel,
        voltage: s.voltage,
        current: s.current,
        power: s.power,
        powerFactor: s.powerFactor,
        energyKWh: s.energyKWh,
        parts: s.parts,
        rejects: s.rejects,
        oee: s.oee,
        health: s.health,
        failureProbability: s.failureProbability,
        status: s.state,
      };
    });
    this.recentReadings.unshift(...records.reverse());
    if (this.recentReadings.length > 1200) this.recentReadings.length = 1200;
    this.emit("snapshot", records);
  }
}

module.exports = new PlantSimulator();
