const express = require("express");

const c = require("../controllers/machineController");
const auth = require("../auth/auth");

const router = express.Router();
const can = auth.requirePermission;

// ---------- public ----------
router.post("/auth/login", auth.login);
router.get("/status", c.getStatus);

// ---------- everything below needs a login ----------
router.use(auth.requireAuth);
router.get("/auth/me", auth.me);

// view (all roles)
router.get("/config", can("view"), c.getConfig);
router.get("/model-info", can("view"), c.getModelInfo);
router.get("/machines", can("view"), c.getSnapshot);
router.get("/machines/:id", can("view"), c.getMachine);
router.get("/machines/:id/trend", can("view"), c.getTrend);
router.get("/alerts", can("view"), c.getAlerts);
router.get("/maintenance", can("view"), c.getMaintenanceLog);

// acknowledge alerts (all roles)
router.post("/alerts/ack-all", can("ack"), c.ackAll);
router.post("/alerts/:id/ack", can("ack"), c.ackAlert);

// maintenance (Maintenance, Manager)
router.post("/machines/:id/maintenance", can("maintenance"), c.startMaintenance);
router.get("/history", can("history"), c.getHistory);

// manager only
router.post("/machines/:id/fault", can("demo"), c.injectFault);
router.post("/plant/reset-shift", can("shift"), c.resetShift);

module.exports = router;
