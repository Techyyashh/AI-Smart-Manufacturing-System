const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const http = require("http");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const { isDBConnected } = require("./config/db");
const apiRoutes = require("./routes/machineRoutes");
const attachRealtime = require("./realtime");
const { usingTempSecret } = require("./auth/auth");
const plant = require("./simulator/plantSimulator");

const Machine = require("./models/machine");
const Alert = require("./models/alert");
const MaintenanceLog = require("./models/maintenanceLog");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// REST API
app.use("/api", apiRoutes);

// Dashboard (frontend folder) at http://localhost:5000
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ---------- persistence (only when MongoDB is connected) ----------
plant.on("snapshot", (records) => {
  if (!isDBConnected()) return;
  Machine.insertMany(records).catch((e) => console.log("Save readings failed:", e.message));
});

plant.on("alert", (a) => {
  if (!isDBConnected() || a.severity === "info") return;
  const { id, ...rest } = a;
  Alert.updateOne({ alertId: id }, { alertId: id, ...rest }, { upsert: true })
    .catch((e) => console.log("Save alert failed:", e.message));
});

plant.on("maintenance", (entry) => {
  if (!isDBConnected()) return;
  const { id, ...rest } = entry;
  MaintenanceLog.updateOne({ logId: id }, { logId: id, ...rest }, { upsert: true })
    .catch((e) => console.log("Save maintenance log failed:", e.message));
});

// ---------- start ----------
const server = http.createServer(app);
attachRealtime(server);

connectDB();
plant.start();

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.log(`\nPort ${PORT} is already in use - the backend is probably already running in another terminal.`);
    console.log("Stop it there with Ctrl + C, then run npm start again.\n");
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, () => {
  console.log(`Dashboard:  http://localhost:${PORT}`);
  console.log(`Live data:  ws://localhost:${PORT}/ws`);
  if (usingTempSecret) console.log("Tip: set JWT_SECRET in backend/.env so logins survive a server restart.");
});
