// ============================================================
// REAL-TIME STREAM (WebSocket on ws://localhost:5000/ws)
// Sends an "init" message when a dashboard connects, then a "tick"
// every second plus "alert" and "maintenance" events as they happen.
// ============================================================
const { WebSocketServer, WebSocket } = require("ws");

const plant = require("./simulator/plantSimulator");
const { verifyToken } = require("./auth/auth");

function attachRealtime(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const broadcast = (type, data) => {
    const msg = JSON.stringify({ type, data });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  };

  wss.on("connection", (socket, req) => {
    const token = new URL(req.url, "http://localhost").searchParams.get("token");
    const user = verifyToken(token);
    if (!user) {
      socket.close(4001, "Login required"); // dashboard shows the login screen
      return;
    }
    socket.user = user;
    socket.send(JSON.stringify({ type: "init", data: plant.initPayload() }));
  });
  wss.on("error", () => {}); // reported by the HTTP server instead

  plant.on("tick", (snapshot) => broadcast("tick", snapshot));
  plant.on("alert", (alert) => broadcast("alert", alert));
  plant.on("maintenance", (entry) => broadcast("maintenance", entry));

  // drop dead connections
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) client.terminate();
    });
  }, 30000);

  return wss;
}

module.exports = attachRealtime;
