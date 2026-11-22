const plant = require("../simulator/plantSimulator");
const aiClient = require("../simulator/aiClient");
const Machine = require("../models/machine");
const { isDBConnected } = require("../config/db");

const findMachine = (req, res) => {
  const m = plant.getMachine(String(req.params.id).toUpperCase());
  if (!m) res.status(404).json({ error: `Machine ${req.params.id} not found` });
  return m;
};

// GET /api/status
exports.getStatus = (req, res) => {
  res.json({
    backend: true,
    database: isDBConnected(),
    ml: aiClient.online,
    simSpeed: plant.config().simSpeed,
    machines: plant.machines.length,
  });
};

// GET /api/config
exports.getConfig = (req, res) => res.json(plant.config());

// GET /api/machines - live snapshot of the whole plant
exports.getSnapshot = (req, res) => res.json(plant.snapshot());

// GET /api/machines/:id
exports.getMachine = (req, res) => {
  const m = findMachine(req, res);
  if (!m) return;
  res.json({ ...plant.config().machines.find((c) => c.id === m.cfg.id), live: plant.machineSummary(m) });
};

// GET /api/machines/:id/trend?points=300 - last N seconds of live data
exports.getTrend = (req, res) => {
  const m = findMachine(req, res);
  if (!m) return;
  const points = Math.min(parseInt(req.query.points, 10) || 120, 300);
  res.json(m.history.slice(-points));
};

// POST /api/machines/:id/fault  { mode: "overheat" | "bearing" | "electrical" | "pressure" }
exports.injectFault = (req, res) => {
  const m = findMachine(req, res);
  if (!m) return;
  try {
    plant.injectFault(m, req.body.mode || "bearing", true, req.user.name);
    res.json({ ok: true, machine: plant.machineSummary(m) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// POST /api/machines/:id/maintenance  { type: "Preventive" | "Corrective", note }
exports.startMaintenance = (req, res) => {
  const m = findMachine(req, res);
  if (!m) return;
  try {
    const entry = plant.startMaintenance(m, req.body.type, req.body.note || "", req.user.name);
    res.json({ ok: true, entry });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// POST /api/plant/reset-shift
exports.resetShift = (req, res) => {
  plant.resetShift(req.user.name);
  res.json({ ok: true });
};

// GET /api/alerts?limit=100
exports.getAlerts = (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
  res.json({ counts: plant.alertEngine.counts(), alerts: plant.alertEngine.alerts.slice(0, limit) });
};

// POST /api/alerts/:id/ack
exports.ackAlert = (req, res) => {
  const a = plant.alertEngine.acknowledge(req.params.id, req.user.name);
  if (!a) return res.status(404).json({ error: "Alert not found" });
  res.json(a);
};

// POST /api/alerts/ack-all
exports.ackAll = (req, res) => {
  plant.alertEngine.acknowledgeAll(req.user.name);
  res.json({ ok: true });
};

// GET /api/maintenance
exports.getMaintenanceLog = (req, res) => res.json(plant.maintenanceLog.slice(0, 100));

// GET /api/history?machineId=M01&limit=200
// Stored snapshots (every 10 s) - from MongoDB when connected, otherwise memory
exports.getHistory = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
  const machineId = req.query.machineId;
  if (isDBConnected()) {
    try {
      const q = machineId ? { machineId } : {};
      const rows = await Machine.find(q).sort({ createdAt: -1 }).limit(limit).lean();
      return res.json({ source: "database", rows });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  const rows = plant.recentReadings.filter((r) => !machineId || r.machineId === machineId).slice(0, limit);
  res.json({ source: "memory", rows });
};

// GET /api/model-info
exports.getModelInfo = (req, res) => {
  if (!aiClient.online) return res.status(503).json({ error: "ML service unavailable" });
  res.json(aiClient.modelInfo || {});
};
