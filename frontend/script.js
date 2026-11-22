// ============================================================
// SMARTFACTORY AI - REAL-TIME MONITORING DASHBOARD
// Receives live machine data from the backend over a WebSocket
// (ws://localhost:5000/ws) and renders it. All sensor simulation now
// happens on the server (backend/simulator), like a real IIoT system.
// ============================================================

// ------------------------------------------------------------
// ICONS (inline SVG, stroke style)
// ------------------------------------------------------------
const ICONS = {
  factory: '<path d="M2 20V9l6 4V9l6 4V5h4l1 15z"/><path d="M6 17h1M11 17h1M16 17h1"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  heart: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  gauge: '<path d="M12 14 16 10"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  rupee: '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

// ------------------------------------------------------------
// CONNECTION SETTINGS
// Served by the backend -> same origin. Opened from disk or with
// VS Code Live Server -> connect to localhost:5000.
// ------------------------------------------------------------
const SAME_ORIGIN = location.protocol.startsWith("http") && !["5500", "5501"].includes(location.port);
const API_BASE = SAME_ORIGIN ? "" : "http://localhost:5000";
const WS_URL = SAME_ORIGIN
  ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`
  : "ws://localhost:5000/ws";
const CHART_POINTS = 120;
const HISTORY_KEEP = 300;

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------
const state = {
  user: null,         // logged-in user { name, role, roleLabel, permissions }
  connected: false,
  everConnected: false,
  config: null,
  plant: null,
  machines: {},       // id -> live summary
  history: {},        // id -> [points]
  alerts: [],
  alertIds: new Set(),
  alertsVersion: 0,
  maintenanceLog: [],
  maintVersion: 0,
  modelInfo: null,
  database: false,
  page: "overview",
  selected: "M01",
  trendMetric: "temperature",
  alertFilter: "active",
  alertMachine: "",
  historyRows: [],
  built: {},
};

const PAGES = {
  overview: ["Plant overview", "Live status of every machine on the shop floor"],
  machine: ["Machine details", "Every live parameter for one machine"],
  alerts: ["Alerts", "Warnings, critical alarms and machine events"],
  maintenance: ["Maintenance", "Service schedule, wear and work orders"],
  ai: ["AI insights", "Predictive maintenance with machine learning"],
  energy: ["Energy", "Power, energy use and electricity cost"],
  history: ["History", "Stored sensor readings"],
};

// pages that need a specific permission (others are visible to every role)
const PAGE_PERM = { energy: "energy", history: "history" };
const can = (perm) => !!(state.user && state.user.permissions.includes(perm));

const STATE_LABEL = { RUNNING: "Running", IDLE: "Idle", FAULT: "Fault", MAINTENANCE: "Maintenance" };

// ------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (v, d = 1) => (v == null || isNaN(v) ? "-" : Number(v).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }));
const fmtInt = (v) => (v == null || isNaN(v) ? "-" : Math.round(v).toLocaleString("en-IN"));
const pct = (v, d = 0) => (v == null ? "-" : fmt(v * 100, d) + "%");
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const timeLabel = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const machineCfg = (id) => state.config.machines.find((m) => m.id === id);
const machineIds = () => (state.config ? state.config.machines.map((m) => m.id) : []);
const seriesVar = (id) => `--s${machineIds().indexOf(id) + 1}`;

function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function fmtHours(h) {
  if (h == null) return "-";
  if (Math.abs(h) >= 48) return `${fmt(h / 24, 1)} days`;
  return `${fmt(h, 0)} h`;
}
function healthLevel(h) { return h >= 75 ? "ok" : h >= 50 ? "warn" : "crit"; }
function levelColor(l) { return l === "ok" ? cssVar("--good") : l === "warn" ? cssVar("--warning") : cssVar("--critical"); }
function riskLevel(p) { return p > 0.8 ? "crit" : p > 0.5 ? "warn" : "ok"; }
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fillIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    if (!el.dataset.iconDone) { el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon)); el.dataset.iconDone = "1"; }
  });
}

// ring gauge markup + updater
function ringHTML(label = "Health") {
  const r = 42, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="${r}" fill="none" stroke-width="9"/>
    <circle class="bar" cx="50" cy="50" r="${r}" fill="none" stroke-width="9" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg>
    <div class="ring-text"><div><b class="num">-</b><span>${label}</span></div></div>`;
}
function setRing(el, value) {
  const r = 42, c = 2 * Math.PI * r;
  const bar = el.querySelector(".bar");
  bar.style.strokeDashoffset = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  bar.style.stroke = levelColor(healthLevel(value));
  el.querySelector("b").textContent = Math.round(value);
}

// ------------------------------------------------------------
// METRIC DEFINITIONS (thresholds mirror backend/simulator/alertEngine.js)
// ------------------------------------------------------------
const running = (m) => m.state === "RUNNING";
const MECH = [
  { k: "temperature", label: "Temperature", unit: "°C", d: 1,
    nom: (n) => `Normal ${n.temperature} °C · trip at ${n.temperature + 45} °C`, max: (n) => n.temperature + 50,
    st: (v, n) => (v > n.temperature + 30 ? "crit" : v > n.temperature + 15 ? "warn" : "ok") },
  { k: "vibration", label: "Vibration", unit: "mm/s", d: 2,
    nom: (n) => `Normal ${n.vibration} mm/s RMS`, max: (n) => n.vibration * 4.5,
    st: (v, n, m) => (!running(m) ? "ok" : v > n.vibration * 2.5 ? "crit" : v > n.vibration * 1.6 ? "warn" : "ok") },
  { k: "rpm", label: "Speed", unit: "RPM", d: 0,
    nom: (n) => `Rated ${fmtInt(n.rpm)} RPM`, max: (n) => n.rpm * 1.15, st: () => "ok" },
  { k: "load", label: "Load", unit: "%", d: 1,
    nom: (n) => `Typical ${n.load}%`, max: () => 100, st: (v) => (v > 95 ? "warn" : "ok") },
  { k: "pressure", label: "Pressure", unit: "bar", d: 2, labelFn: (c) => c.pressureLabel,
    nom: (n) => `Normal ${n.pressure} bar`, max: (n) => n.pressure * 1.5,
    st: (v, n, m) => { if (!running(m)) return "ok"; const d = Math.abs(v - n.pressure) / n.pressure; return d > 0.3 ? "crit" : d > 0.15 ? "warn" : "ok"; } },
  { k: "oilLevel", label: "Lubricant level", unit: "%", d: 0,
    nom: () => "Top up below 25%", max: () => 100, st: (v) => (v < 10 ? "crit" : v < 25 ? "warn" : "ok") },
];
const ratedCurrent = (n) => (n.ratedPower * 1000) / (Math.sqrt(3) * n.voltage * n.powerFactor);
const ELEC = [
  { k: "voltage", label: "Supply voltage", unit: "V", d: 1, nom: (n) => `Nominal ${n.voltage} V (3-phase)`,
    st: (v, n, m) => { if (!running(m)) return "ok"; const d = Math.abs(v - n.voltage) / n.voltage; return d > 0.1 ? "crit" : d > 0.05 ? "warn" : "ok"; } },
  { k: "current", label: "Current", unit: "A", d: 1, nom: (n) => `Full-load ${fmt(ratedCurrent(n), 1)} A`,
    max: (n) => ratedCurrent(n) * 1.5, st: (v, n) => (v > ratedCurrent(n) * 1.25 ? "warn" : "ok") },
  { k: "power", label: "Active power", unit: "kW", d: 2, nom: (n) => `Rated ${n.ratedPower} kW`,
    max: (n) => n.ratedPower * 1.3, st: (v, n) => (v > n.ratedPower * 1.15 ? "warn" : "ok") },
  { k: "powerFactor", label: "Power factor", unit: "", d: 2, nom: (n) => `Normal ${n.powerFactor}`,
    max: () => 1, st: (v, n, m) => (running(m) && v < 0.72 ? "warn" : "ok") },
  { k: "energyKWh", label: "Energy this shift", unit: "kWh", d: 1, nom: () => "", st: () => "none" },
  { k: "energyCost", label: "Energy cost this shift", unit: "", d: 0, prefix: "₹", nom: () => "", st: () => "none" },
];

function metricRowHTML(key, label, unit, hasBar) {
  return `<div class="metric" data-m="${key}">
    <div class="metric-name"><i class="st"></i>${esc(label)}</div>
    <div class="metric-val num"><span class="v">-</span><small>${esc(unit)}</small></div>
    ${hasBar ? '<div class="bar-track"><div class="bar-fill"></div></div>' : ""}
    <div class="metric-nom"></div>
  </div>`;
}
function updateMetricRow(root, key, text, level, barPct, nomText) {
  const row = root.querySelector(`[data-m="${key}"]`);
  if (!row) return;
  row.querySelector(".v").textContent = text;
  const lv = level || "ok";
  row.querySelector(".st").className = `st ${lv}`;
  row.querySelector(".metric-val").className = `metric-val num ${lv === "ok" || lv === "none" ? "" : lv}`;
  const bar = row.querySelector(".bar-fill");
  if (bar && barPct != null) {
    bar.style.width = `${Math.max(0, Math.min(100, barPct))}%`;
    bar.className = `bar-fill ${lv === "none" ? "" : lv}`;
  }
  if (nomText !== undefined) row.querySelector(".metric-nom").textContent = nomText;
}

// ------------------------------------------------------------
// CONNECTION (WebSocket + REST)
// ------------------------------------------------------------
let ws = null;
let retryMs = 1000;
let reconnectTimer = null;

// ---------- login token ----------
function getToken() { try { return localStorage.getItem("sf-token"); } catch (e) { return state.token || null; } }
function setToken(t) {
  state.token = t;
  try { t ? localStorage.setItem("sf-token", t) : localStorage.removeItem("sf-token"); } catch (e) {}
}
// fetch with the login token attached; a 401 sends the user back to the login screen
async function authFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401 && state.user) logout("Your session has expired. Please sign in again.");
  return res;
}

function connect() {
  if (!getToken()) return;
  clearTimeout(reconnectTimer);
  try { ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(getToken())}`); } catch (e) { scheduleReconnect(); return; }

  ws.onopen = () => {
    state.connected = true;
    state.everConnected = true;
    retryMs = 1000;
    updateConnectionUI();
    refreshStatus();
  };
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.type === "init") onInit(msg.data);
    else if (msg.type === "tick") onTick(msg.data);
    else if (msg.type === "alert") onAlert(msg.data, true);
    else if (msg.type === "maintenance") onMaintenance(msg.data);
  };
  ws.onclose = (ev) => {
    state.connected = false;
    updateConnectionUI();
    if (ev.code === 4001) { logout("Your session has expired. Please sign in again."); return; }
    if (state.user) scheduleReconnect();
  };
  ws.onerror = () => { try { ws.close(); } catch (e) {} };
}
function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, retryMs);
  retryMs = Math.min(retryMs * 1.6, 10000);
}

async function api(path, body) {
  try {
    const res = await authFetch(path, body !== undefined
      ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } catch (e) {
    toast({ severity: "warning", machineName: "Action failed", message: e.message });
    return null;
  }
}

async function refreshStatus() {
  try {
    const res = await fetch(API_BASE + "/api/status");
    const s = await res.json();
    state.database = !!s.database;
  } catch (e) { state.database = false; }
  updateConnectionUI();
}
setInterval(() => { if (state.connected) refreshStatus(); }, 15000);

// ------------------------------------------------------------
// MESSAGE HANDLERS
// ------------------------------------------------------------
function onInit(d) {
  state.config = d.config;
  state.plant = d.plant;
  state.machines = Object.fromEntries(d.machines.map((m) => [m.id, m]));
  state.history = d.history;
  state.alerts = d.alerts;
  state.alertIds = new Set(d.alerts.map((a) => a.id));
  state.maintenanceLog = d.maintenanceLog;
  state.modelInfo = d.modelInfo;
  state.alertsVersion++;
  state.maintVersion++;
  if (!state.config.machines.some((m) => m.id === state.selected)) state.selected = state.config.machines[0].id;
  state.built = {}; // rebuild page skeletons for the (possibly new) config
  buildStatic();
  renderAll(true);
}

function onTick(d) {
  if (!state.config) return;
  state.plant = d.plant;
  d.machines.forEach((m) => {
    state.machines[m.id] = m;
    const h = state.history[m.id] || (state.history[m.id] = []);
    h.push({
      t: d.ts, temperature: m.temperature, vibration: m.vibration, rpm: m.rpm, load: m.load,
      power: m.power, current: m.current, voltage: m.voltage, pressure: m.pressure,
      health: m.health, failureProbability: m.failureProbability,
    });
    if (h.length > HISTORY_KEEP) h.shift();
  });
  if (!state.modelInfo && state.plant.ai.online) loadModelInfo();
  renderAll(false);
}

function onAlert(a, live) {
  const i = state.alerts.findIndex((x) => x.id === a.id);
  if (i >= 0) state.alerts[i] = a;
  else {
    state.alerts.unshift(a);
    if (state.alerts.length > 300) state.alerts.pop();
    if (live && !state.alertIds.has(a.id) && (a.severity === "critical" || a.severity === "warning") && a.active) toast(a);
  }
  state.alertIds.add(a.id);
  state.alertsVersion++;
}

function onMaintenance(entry) {
  const i = state.maintenanceLog.findIndex((x) => x.id === entry.id);
  if (i >= 0) state.maintenanceLog[i] = entry; else state.maintenanceLog.unshift(entry);
  state.maintVersion++;
  if (entry.status === "Completed") toast({ severity: "info", machineName: entry.machineName, message: "Maintenance completed - machine back in service" });
}

async function loadModelInfo() {
  if (loadModelInfo.busy) return;
  loadModelInfo.busy = true;
  try {
    const res = await authFetch("/api/model-info");
    if (res.ok) state.modelInfo = await res.json();
  } catch (e) { /* offline */ }
  setTimeout(() => (loadModelInfo.busy = false), 5000);
}

// ------------------------------------------------------------
// CONNECTION / HEADER UI
// ------------------------------------------------------------
function updateConnectionUI() {
  const pill = $("live-pill");
  pill.classList.toggle("live", state.connected);
  pill.classList.toggle("down", !state.connected && state.everConnected);
  $("live-text").textContent = state.connected ? "Live" : state.everConnected ? "Reconnecting..." : "Connecting...";
  $("conn-banner").classList.toggle("show", !state.connected);

  const set = (id, cls, text) => { $(id).className = `sys-dot ${cls}`; $(id + "-t").textContent = text; };
  set("sys-stream", state.connected ? "on" : "off", state.connected ? "Live" : "Offline");
  const ai = state.connected && state.plant && state.plant.ai.online;
  set("sys-ai", ai ? "on" : state.connected ? "partial" : "off", ai ? "Online" : "Offline");
  set("sys-db", state.connected && state.database ? "on" : state.connected ? "partial" : "off", state.connected && state.database ? "Connected" : "Not connected");
}

function updateHeader() {
  const p = state.plant;
  if (!p) return;
  const h = Math.floor(p.shiftHours), mm = Math.floor((p.shiftHours - h) * 60);
  $("shift-chip").textContent = `Shift ${h}h ${String(mm).padStart(2, "0")}m · ${state.config.simSpeed}× speed`;
  const n = p.alerts.unacknowledged;
  [$("bell-badge"), $("nav-alert-badge")].forEach((b) => { b.textContent = n > 99 ? "99+" : n; b.classList.toggle("show", n > 0); });
  updateConnectionUI();
}

// ------------------------------------------------------------
// THEME
// ------------------------------------------------------------
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("sf-theme", t); } catch (e) {}
  applyChartTheme();
  renderAll(true);
}

// ------------------------------------------------------------
// NAVIGATION
// ------------------------------------------------------------
function showPage(page, push = true) {
  if (!PAGES[page]) page = "overview";
  if (PAGE_PERM[page] && !can(PAGE_PERM[page])) page = "overview";
  state.page = page;
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === `page-${page}`));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  $("page-title").textContent = PAGES[page][0];
  $("page-sub").textContent = PAGES[page][1];
  document.body.classList.remove("nav-open");
  if (push) history.replaceState(null, "", page === "machine" ? `#machine/${state.selected}` : `#${page}`);
  if (page === "history") loadHistory();
  renderAll(true);
  window.scrollTo({ top: 0 });
}
function openMachine(id) {
  state.selected = id;
  state.built.machine = null;
  showPage("machine");
}

// ------------------------------------------------------------
// CHARTS
// ------------------------------------------------------------
const charts = {};

function baseOptions(yTitle, yMin, yMax) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar("--surface"), titleColor: cssVar("--text"), bodyColor: cssVar("--text-2"),
        borderColor: cssVar("--border"), borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
      },
    },
    scales: {
      x: { grid: { display: false }, border: { color: cssVar("--border") },
           ticks: { color: cssVar("--muted"), maxTicksLimit: 6, maxRotation: 0, font: { size: 11 } } },
      y: { min: yMin, max: yMax, grid: { color: cssVar("--grid") }, border: { display: false },
           title: { display: !!yTitle, text: yTitle, color: cssVar("--muted"), font: { size: 11 } },
           ticks: { color: cssVar("--muted"), maxTicksLimit: 5, font: { size: 11 } } },
    },
    elements: {
      line: { borderWidth: 2, tension: 0.3 },
      point: { radius: 0, hoverRadius: 4, hitRadius: 8 },
    },
  };
}

function lineDataset(label, colorVar, extra = {}) {
  return { label, data: [], borderColor: cssVar(colorVar), backgroundColor: cssVar(colorVar), _colorVar: colorVar, pointBorderColor: cssVar("--surface"), pointBorderWidth: 2, ...extra };
}

function makeChart(key, canvasId, type, datasets, options) {
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart($(canvasId), { type, data: { labels: [], datasets }, options });
  return charts[key];
}

function applyChartTheme() {
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.color = cssVar("--muted");
  Object.values(charts).forEach((ch) => {
    const o = ch.options;
    o.plugins.tooltip.backgroundColor = cssVar("--surface");
    o.plugins.tooltip.titleColor = cssVar("--text");
    o.plugins.tooltip.bodyColor = cssVar("--text-2");
    o.plugins.tooltip.borderColor = cssVar("--border");
    o.scales.x.ticks.color = cssVar("--muted");
    o.scales.x.border.color = cssVar("--border");
    o.scales.y.ticks.color = cssVar("--muted");
    o.scales.y.grid.color = cssVar("--grid");
    if (o.scales.y.title) o.scales.y.title.color = cssVar("--muted");
    ch.data.datasets.forEach((ds) => {
      if (ds._colorVar) {
        const c = cssVar(ds._colorVar);
        ds.borderColor = ds._dashed ? cssVar("--muted") : c;
        ds.backgroundColor = ds._fill ? hexA(c, 0.12) : c;
        ds.pointBorderColor = cssVar("--surface");
      }
      if (ds._colorVars) ds.backgroundColor = ds._colorVars.map(cssVar);
    });
    ch.update("none");
  });
}
function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function buildCharts() {
  const ids = machineIds();
  const names = ids.map((id) => machineCfg(id).name);
  const vars = ids.map(seriesVar);

  makeChart("power", "ch-power", "line", ids.map((id) => lineDataset(machineCfg(id).name, seriesVar(id))), baseOptions("kW", 0));

  const oeeOpts = baseOptions("%", 0, 100);
  oeeOpts.interaction = { mode: "nearest", intersect: true };
  oeeOpts.plugins.tooltip.callbacks = { label: (c) => ` OEE ${fmt(c.parsed.y, 1)}%` };
  makeChart("oee", "ch-oee", "bar", [{
    label: "OEE", data: [], backgroundColor: vars.map(cssVar), _colorVars: vars,
    borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: "bottom", maxBarThickness: 56,
  }], oeeOpts);
  charts.oee.data.labels = names;

  makeChart("trend", "ch-trend", "line", [
    lineDataset("Value", "--s1", { _fill: true, fill: true, backgroundColor: hexA(cssVar("--s1"), 0.12) }),
    lineDataset("Normal", "--muted", { _dashed: true, borderDash: [5, 4], borderWidth: 1.5, borderColor: cssVar("--muted"), pointHoverRadius: 0 }),
  ], baseOptions(""));

  makeChart("health", "ch-health", "line", [
    lineDataset("Health score", "--s3"),
    lineDataset("Failure risk", "--s2"),
  ], baseOptions("%", 0, 100));

  makeChart("risk", "ch-risk", "line", ids.map((id) => lineDataset(machineCfg(id).name, seriesVar(id))), baseOptions("%", 0, 100));

  makeChart("totalPower", "ch-total-power", "line", [
    lineDataset("Total power", "--s1", { _fill: true, fill: true, backgroundColor: hexA(cssVar("--s1"), 0.12) }),
  ], baseOptions("kW", 0));

  const enOpts = baseOptions("kWh", 0);
  enOpts.interaction = { mode: "nearest", intersect: true };
  enOpts.plugins.tooltip.callbacks = { label: (c) => ` ${fmt(c.parsed.y, 1)} kWh` };
  makeChart("energy", "ch-energy", "bar", [{
    label: "Energy", data: [], backgroundColor: vars.map(cssVar), _colorVars: vars,
    borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: "bottom", maxBarThickness: 56,
  }], enOpts);
  charts.energy.data.labels = names;

  // legends (name + colour swatch, so identity never relies on colour alone in the tooltip)
  const legend = ids.map((id) => `<span><i style="background:var(${seriesVar(id)})"></i>${esc(machineCfg(id).name)}</span>`).join("");
  $("power-legend").innerHTML = legend;
  $("risk-legend").innerHTML = legend;
}

function lastN(id, n = CHART_POINTS) { return (state.history[id] || []).slice(-n); }

function updateCharts() {
  const ids = machineIds();
  const ref = lastN(ids[0]);
  const labels = ref.map((p) => timeLabel(p.t));
  const p = state.page;

  if (p === "overview") {
    charts.power.data.labels = labels;
    ids.forEach((id, i) => (charts.power.data.datasets[i].data = lastN(id).map((x) => x.power)));
    charts.power.update("none");
    charts.oee.data.datasets[0].data = ids.map((id) => +(state.machines[id].oee * 100).toFixed(1));
    charts.oee.update("none");
  }

  if (p === "machine") {
    const id = state.selected, cfg = machineCfg(id), h = lastN(id);
    const spec = TREND_METRICS.find((t) => t.k === state.trendMetric);
    const ds = charts.trend.data.datasets;
    charts.trend.data.labels = h.map((x) => timeLabel(x.t));
    ds[0].label = spec.label;
    ds[0].data = h.map((x) => (spec.scale ? x[spec.k] * spec.scale : x[spec.k]));
    const nom = spec.nom ? spec.nom(cfg.nominal) : null;
    ds[1].data = nom == null ? [] : h.map(() => nom);
    ds[1].hidden = nom == null;
    charts.trend.options.scales.y.title.text = spec.unit;
    charts.trend.options.scales.y.title.display = !!spec.unit;
    charts.trend.options.scales.y.min = spec.min;
    charts.trend.options.scales.y.max = spec.max;
    charts.trend.update("none");

    charts.health.data.labels = h.map((x) => timeLabel(x.t));
    charts.health.data.datasets[0].data = h.map((x) => x.health);
    charts.health.data.datasets[1].data = h.map((x) => +(x.failureProbability * 100).toFixed(1));
    charts.health.update("none");
  }

  if (p === "ai") {
    charts.risk.data.labels = labels;
    ids.forEach((id, i) => (charts.risk.data.datasets[i].data = lastN(id).map((x) => +(x.failureProbability * 100).toFixed(1))));
    charts.risk.update("none");
  }

  if (p === "energy") {
    charts.totalPower.data.labels = labels;
    charts.totalPower.data.datasets[0].data = ref.map((_, i) =>
      +ids.reduce((sum, id) => sum + ((lastN(id)[i] || {}).power || 0), 0).toFixed(2));
    charts.totalPower.update("none");
    charts.energy.data.datasets[0].data = ids.map((id) => state.machines[id].energyKWh);
    charts.energy.update("none");
  }
}

const TREND_METRICS = [
  { k: "temperature", label: "Temperature", unit: "°C", nom: (n) => n.temperature },
  { k: "vibration", label: "Vibration", unit: "mm/s", nom: (n) => n.vibration, min: 0 },
  { k: "rpm", label: "Speed", unit: "RPM", nom: (n) => n.rpm, min: 0 },
  { k: "load", label: "Load", unit: "%", nom: (n) => n.load, min: 0, max: 100 },
  { k: "pressure", label: "Pressure", unit: "bar", nom: (n) => n.pressure, min: 0 },
  { k: "power", label: "Power", unit: "kW", nom: (n) => n.ratedPower, min: 0 },
  { k: "current", label: "Current", unit: "A", nom: (n) => +ratedCurrent(n).toFixed(1), min: 0 },
  { k: "voltage", label: "Voltage", unit: "V", nom: (n) => n.voltage },
];

// ------------------------------------------------------------
// STATIC BUILD (once per init)
// ------------------------------------------------------------
function buildStatic() {
  const ids = machineIds();

  // state legend
  $("state-legend").innerHTML = ["RUNNING", "IDLE", "MAINTENANCE", "FAULT"]
    .map((s) => `<span class="badge ${s}">${STATE_LABEL[s]}</span>`).join("");

  // KPI tiles
  const kpi = (id, label, ic) => `<div class="card kpi"><div class="kpi-label"><span class="kpi-icon">${icon(ic)}</span>${label}</div>
    <div class="kpi-value num" id="kpi-${id}">-</div><div class="kpi-foot" id="kpi-${id}-f">&nbsp;</div></div>`;
  $("kpis").innerHTML = [
    kpi("oee", "Plant OEE", "gauge"), kpi("running", "Machines running", "cog"), kpi("parts", "Good parts", "box"),
    kpi("power", "Live power", "zap"), kpi("health", "Average health", "heart"), kpi("alerts", "Active alerts", "bell"),
  ].join("");

  // machine cards
  $("machine-grid").innerHTML = ids.map((id) => {
    const c = machineCfg(id);
    const stat = (k, label) => `<div><div class="m-stat-label">${label}</div><div class="m-stat-value num" id="mc-${id}-${k}">-</div></div>`;
    return `<div class="card m-card" id="mc-${id}" data-id="${id}" tabindex="0" role="button" aria-label="Open ${esc(c.name)}">
      <div class="m-top">
        <div><div class="m-name">${esc(c.name)} <span class="muted mono" style="font-size:11px">${id}</span></div><div class="m-type">${esc(c.type)} · ${esc(c.line)}</div></div>
        <span class="badge" id="mc-${id}-badge">-</span>
      </div>
      <div class="m-mid">
        <div class="ring" id="mc-${id}-ring">${ringHTML()}</div>
        <div class="m-stats">${stat("temp", "Temperature")}${stat("vib", "Vibration")}${stat("power", "Power")}${stat("oee", "OEE")}</div>
      </div>
      <div class="m-reason" id="mc-${id}-reason"></div>
      <div class="m-foot"><span id="mc-${id}-parts">-</span><span id="mc-${id}-risk">-</span></div>
    </div>`;
  }).join("");

  // machine tabs
  $("machine-tabs").innerHTML = ids.map((id) =>
    `<button class="m-tab" data-id="${id}"><span class="sdot" id="tab-${id}-dot"></span>${esc(machineCfg(id).name)}</button>`).join("");

  // trend metric selector
  $("trend-seg").innerHTML = TREND_METRICS.map((t) =>
    `<button data-k="${t.k}" class="${t.k === state.trendMetric ? "active" : ""}">${t.label}</button>`).join("");

  // fault selector
  $("fault-select").innerHTML = state.config.faultModes.map((f) => `<option value="${f.key}">${esc(f.label)}</option>`).join("");

  // machine filters
  const opts = `<option value="">All machines</option>` + ids.map((id) => `<option value="${id}">${esc(machineCfg(id).name)}</option>`).join("");
  $("alert-machine").innerHTML = opts;
  $("alert-machine").value = state.alertMachine;
  $("hist-machine").innerHTML = opts;

  // alert KPIs
  const ak = (id, label, ic) => `<div class="card kpi"><div class="kpi-label"><span class="kpi-icon">${icon(ic)}</span>${label}</div><div class="kpi-value num" id="ak-${id}">-</div></div>`;
  $("alert-kpis").innerHTML = ak("crit", "Critical (active)", "alert") + ak("warn", "Warnings (active)", "alert") + ak("unack", "Unacknowledged", "bell") + ak("total", "Alerts this session", "clock");

  // maintenance table
  $("maint-body").innerHTML = ids.map((id) => {
    const c = machineCfg(id);
    return `<tr data-id="${id}">
      <td><span class="swatch" style="background:var(${seriesVar(id)})"></span><b>${esc(c.name)}</b><div class="muted" style="font-size:12px;margin-left:18px">${esc(c.type)}</div></td>
      <td><span class="badge" data-c="state">-</span></td>
      <td class="r num" data-c="total">-</td>
      <td><div class="cell-bar"><div class="bar-track"><div class="bar-fill" data-c="svcbar"></div></div><span class="num" data-c="svc">-</span></div><div class="muted" style="font-size:11px">interval ${c.serviceInterval} h</div></td>
      <td class="r num" data-c="due">-</td>
      <td><div class="cell-bar"><div class="bar-track"><div class="bar-fill" data-c="wearbar"></div></div><span class="num" data-c="wear">-</span></div></td>
      <td class="r num" data-c="rul">-</td>
      <td class="r num" data-c="health">-</td>
      <td class="r"><button class="btn sm" data-action="maint" data-id="${id}">Service</button></td>
    </tr>`;
  }).join("");

  // risk list (AI)
  $("risk-list").innerHTML = ids.map((id) => `<div class="risk-row" data-id="${id}">
      <div><span class="swatch" style="background:var(${seriesVar(id)})"></span><b>${esc(machineCfg(id).name)}</b></div>
      <div class="bar-track"><div class="bar-fill" data-c="bar"></div></div>
      <div class="num r" data-c="pct" style="text-align:right;font-weight:600">-</div>
      <div class="risk-extra"><span class="badge" data-c="level">-</span></div>
    </div>`).join("");

  // energy KPIs + table
  $("energy-kpis").innerHTML = [
    ["tp", "Live plant power", "zap"], ["en", "Energy this shift", "gauge"], ["cost", "Energy cost this shift", "rupee"], ["pf", "Average power factor", "heart"],
  ].map(([id, l, ic]) => `<div class="card kpi"><div class="kpi-label"><span class="kpi-icon">${icon(ic)}</span>${l}</div><div class="kpi-value num" id="ek-${id}">-</div><div class="kpi-foot" id="ek-${id}-f">&nbsp;</div></div>`).join("");
  $("energy-body").innerHTML = ids.map((id) => `<tr data-id="${id}">
      <td><span class="swatch" style="background:var(${seriesVar(id)})"></span><b>${esc(machineCfg(id).name)}</b></td>
      <td class="r num" data-c="v">-</td><td class="r num" data-c="i">-</td><td class="r num" data-c="p">-</td>
      <td class="r num" data-c="pf">-</td><td class="r num" data-c="e">-</td><td class="r num" data-c="c">-</td>
      <td><div class="cell-bar"><div class="bar-track"><div class="bar-fill" data-c="sharebar" style="background:var(${seriesVar(id)})"></div></div><span class="num" data-c="share">-</span></div></td>
    </tr>`).join("");

  buildCharts();
  applyChartTheme();
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
function renderAll(force) {
  updateConnectionUI();
  if (!state.config || !state.plant) return;
  updateHeader();
  const p = state.page;
  if (p === "overview") renderOverview(force);
  if (p === "machine") renderMachine(force);
  if (p === "alerts") renderAlerts(force);
  if (p === "maintenance") renderMaintenance(force);
  if (p === "ai") renderAI(force);
  if (p === "energy") renderEnergy();
  if (p === "history" && force) renderHistoryTable();
  updateCharts();
}

// ---------- OVERVIEW ----------
function renderOverview(force) {
  const p = state.plant;
  const set = (id, html, foot) => { $(`kpi-${id}`).innerHTML = html; if (foot != null) $(`kpi-${id}-f`).innerHTML = foot; };
  set("oee", `${fmt(p.oee * 100, 1)}<small>%</small>`, `A <b>${pct(p.availability)}</b> · P <b>${pct(p.performance)}</b> · Q <b>${pct(p.quality, 1)}</b>`);
  set("running", `${p.running}<small>/ ${p.machinesTotal}</small>`, `${p.idle} idle · ${p.maintenance} in service · <b>${p.fault} fault</b>`);
  set("parts", fmtInt(p.good), `${fmtInt(p.rejects)} rejects · ${pct(p.quality, 1)} quality`);
  set("power", `${fmt(p.totalPower, 1)}<small>kW</small>`, `${fmtInt(p.energyKWh)} kWh · ₹${fmtInt(p.energyCost)} this shift`);
  const ms = Object.values(state.machines);
  const worst = ms.reduce((a, b) => (b.health < a.health ? b : a), ms[0]);
  set("health", `${fmt(p.avgHealth, 0)}<small>%</small>`, `Lowest: <b>${esc(machineCfg(worst.id).name)}</b> ${fmt(worst.health, 0)}%`);
  set("alerts", `${p.alerts.critical + p.alerts.warning}`, `<b>${p.alerts.critical} critical</b> · ${p.alerts.warning} warning`);

  machineIds().forEach((id) => {
    const m = state.machines[id], c = machineCfg(id), n = c.nominal;
    const card = $(`mc-${id}`);
    card.dataset.state = m.state;
    card.dataset.risk = m.state === "RUNNING" && (m.health < 50 || m.failureProbability > 0.5) ? "warn" : "";
    const badge = $(`mc-${id}-badge`);
    badge.className = `badge ${m.state}`;
    badge.textContent = STATE_LABEL[m.state];
    setRing($(`mc-${id}-ring`), m.health);

    const tl = MECH[0].st(m.temperature, n, m), vl = MECH[1].st(m.vibration, n, m);
    $(`mc-${id}-temp`).className = `m-stat-value num ${tl === "ok" ? "" : tl}`;
    $(`mc-${id}-temp`).innerHTML = `${fmt(m.temperature, 1)}<small> °C</small>`;
    $(`mc-${id}-vib`).className = `m-stat-value num ${vl === "ok" ? "" : vl}`;
    $(`mc-${id}-vib`).innerHTML = `${fmt(m.vibration, 2)}<small> mm/s</small>`;
    $(`mc-${id}-power`).innerHTML = `${fmt(m.power, 1)}<small> kW</small>`;
    $(`mc-${id}-oee`).innerHTML = `${fmt(m.oee * 100, 1)}<small> %</small>`;

    const reason = $(`mc-${id}-reason`);
    if (m.diagnosis) { reason.className = "m-reason alert"; reason.textContent = `⚠ ${m.diagnosis}`; }
    else if (m.state === "MAINTENANCE") { reason.className = "m-reason"; reason.textContent = `${m.stateReason} · ready in ${fmtDur(m.maintenanceUntil - Date.now())}`; }
    else if (m.state !== "RUNNING") { reason.className = "m-reason"; reason.textContent = `${m.stateReason} · ${fmtDur(Date.now() - m.stateSince)}`; }
    else { reason.className = "m-reason muted"; reason.textContent = `${fmtInt(m.rpm)} RPM · load ${fmt(m.load, 0)}% · ${fmt(m.cycleTime, 1)} s/part`; }

    $(`mc-${id}-parts`).innerHTML = `<b class="num">${fmtInt(m.good)}</b> good parts`;
    const rl = riskLevel(m.failureProbability);
    $(`mc-${id}-risk`).innerHTML = `Failure risk <b class="num" style="color:${rl === "ok" ? "inherit" : rl === "warn" ? "var(--warning-text)" : "var(--critical-text)"}">${pct(m.failureProbability)}</b>`;
  });

  if (force || state.built.recentV !== state.alertsVersion) {
    state.built.recentV = state.alertsVersion;
    const recent = state.alerts.filter((a) => a.active && a.severity !== "info").slice(0, 5);
    $("recent-alerts").innerHTML = recent.length ? recent.map(alertRowHTML).join("") : `<div class="empty">${icon("check")}<br>No active alerts. All machines within limits.</div>`;
    fillIcons($("recent-alerts"));
  }
}

// ---------- MACHINE DETAIL ----------
function buildMachineDetail() {
  const id = state.selected, c = machineCfg(id), n = c.nominal;
  document.querySelectorAll(".m-tab").forEach((t) => t.classList.toggle("active", t.dataset.id === id));
  $("d-ring").innerHTML = ringHTML();
  $("d-name").textContent = `${c.name}`;
  $("d-mech").innerHTML = MECH.map((s) => metricRowHTML(s.k, s.labelFn ? s.labelFn(c) : s.label, s.unit, !!s.max)).join("");
  $("d-elec").innerHTML = ELEC.map((s) => metricRowHTML(s.k, s.label, s.unit, !!s.max)).join("");
  $("d-prod").innerHTML = `
    <div class="big-nums">
      <div class="big-num"><b class="num" id="dp-parts">-</b><span>Total parts</span></div>
      <div class="big-num"><b class="num" id="dp-good">-</b><span>Good</span></div>
      <div class="big-num"><b class="num" id="dp-rej">-</b><span>Rejects</span></div>
    </div>
    <div class="metric-list">${metricRowHTML("cycle", "Cycle time", "s/part", false)}</div>
    <div class="oee-bars">
      ${["oee:OEE", "availability:Availability", "performance:Performance", "quality:Quality"].map((x) => {
        const [k, l] = x.split(":");
        return `<div class="oee-row"><span>${l}</span><div class="bar-track"><div class="bar-fill" id="dp-${k}-bar"></div></div><b class="num" id="dp-${k}">-</b></div>`;
      }).join("")}
    </div>
    <div class="card-sub" style="margin-bottom:6px">Time this shift</div>
    <div class="stack" id="dp-stack"><div style="background:var(--good)"></div><div style="background:var(--idle)"></div><div style="background:var(--critical)"></div></div>
    <div class="legend" style="margin-top:8px" id="dp-time"></div>`;
  $("d-maint").innerHTML = [
    metricRowHTML("total", "Total running hours", "h", false),
    metricRowHTML("since", "Since last service", "h", true),
    metricRowHTML("due", "Next service due", "", false),
    metricRowHTML("wear", "Component wear", "%", true),
    metricRowHTML("rul", "Remaining useful life", "", false),
    metricRowHTML("last", "Last service", "", false),
  ].join("");
  state.built.machine = id;
}

function renderMachine(force) {
  if (force || state.built.machine !== state.selected) buildMachineDetail();
  const id = state.selected, m = state.machines[id], c = machineCfg(id), n = c.nominal;

  machineIds().forEach((mid) => ($(`tab-${mid}-dot`).className = `sdot ${state.machines[mid].state}`));

  setRing($("d-ring"), m.health);
  const since = m.state === "MAINTENANCE" ? `ready in ${fmtDur(m.maintenanceUntil - Date.now())}` : `for ${fmtDur(Date.now() - m.stateSince)}`;
  $("d-meta").innerHTML = `<span class="badge ${m.state}">${STATE_LABEL[m.state]}</span>
    <span>${esc(m.stateReason)} · ${since}</span><span class="muted">${esc(c.type)} · ${esc(c.line)} · ${id}</span>`;

  const rl = riskLevel(m.failureProbability);
  const rulL = m.rulHours < 24 ? "crit" : m.rulHours < 72 ? "warn" : "";
  $("d-figs").innerHTML = `
    <div><div class="fig-label">Failure risk ${m.aiSource === "model" ? "(AI model)" : "(estimate)"}</div><div class="fig-value num ${rl === "ok" ? "" : rl}">${pct(m.failureProbability, 1)}</div></div>
    <div><div class="fig-label">Remaining useful life</div><div class="fig-value num ${rulL}">${fmtHours(m.rulHours)}</div></div>
    <div><div class="fig-label">OEE</div><div class="fig-value num">${fmt(m.oee * 100, 1)}<small>%</small></div></div>
    <div><div class="fig-label">Good parts</div><div class="fig-value num">${fmtInt(m.good)}</div></div>
    <div><div class="fig-label">Power</div><div class="fig-value num">${fmt(m.power, 1)}<small> kW</small></div></div>`;

  // actions
  const faultBtn = $("fault-btn"), maintBtn = $("maint-btn");
  faultBtn.disabled = m.state !== "RUNNING" || !!m.diagnosis;
  maintBtn.disabled = m.state === "MAINTENANCE";
  maintBtn.lastChild.textContent = m.state === "MAINTENANCE" ? `In maintenance (${fmtDur(m.maintenanceUntil - Date.now())})`
    : m.state === "FAULT" ? "Repair (corrective maintenance)" : "Start maintenance";

  // diagnosis banner
  const diag = $("d-diag");
  diag.classList.toggle("show", !!m.diagnosis);
  diag.classList.toggle("crit", m.state === "FAULT");
  if (m.diagnosis) {
    $("d-diag-text").innerHTML = m.state === "FAULT"
      ? `<b>Machine tripped.</b> Probable cause: ${esc(m.diagnosis)}. Start corrective maintenance to repair it.`
      : `<b>Developing fault detected.</b> ${esc(m.diagnosis)}. Plan maintenance before the machine trips.`;
  }

  // mechanical + electrical
  const mech = $("d-mech");
  MECH.forEach((s) => {
    const v = m[s.k];
    updateMetricRow(mech, s.k, fmt(v, s.k === "pressure" && n.pressure >= 100 ? 0 : s.d), s.st(v, n, m), s.max ? (v / s.max(n)) * 100 : null, s.nom(n));
  });
  const elec = $("d-elec");
  ELEC.forEach((s) => {
    const v = m[s.k];
    updateMetricRow(elec, s.k, (s.prefix || "") + (s.d === 0 ? fmtInt(v) : fmt(v, s.d)), s.st(v, n, m), s.max ? (v / s.max(n)) * 100 : null, s.nom(n));
  });

  // production
  $("dp-parts").textContent = fmtInt(m.parts);
  $("dp-good").textContent = fmtInt(m.good);
  $("dp-rej").textContent = fmtInt(m.rejects);
  updateMetricRow($("d-prod"), "cycle", m.state === "RUNNING" ? fmt(m.cycleTime, 1) : "-",
    m.state === "RUNNING" && m.cycleTime > n.cycleTime * 1.25 ? "warn" : "ok", null, `Ideal ${n.cycleTime} s/part`);
  ["oee", "availability", "performance", "quality"].forEach((k) => {
    const v = m[k] * 100;
    $(`dp-${k}`).textContent = `${fmt(v, 1)}%`;
    const bar = $(`dp-${k}-bar`);
    bar.style.width = `${v}%`;
    bar.className = `bar-fill ${k === "oee" ? (v >= 85 ? "ok" : v >= 60 ? "warn" : "crit") : ""}`;
  });
  const tot = Math.max(1, m.runMin + m.idleMin + m.downtimeMin);
  const st = $("dp-stack").children;
  st[0].style.width = `${(m.runMin / tot) * 100}%`;
  st[1].style.width = `${(m.idleMin / tot) * 100}%`;
  st[2].style.width = `${(m.downtimeMin / tot) * 100}%`;
  $("dp-time").innerHTML = `<span><i style="background:var(--good)"></i>Running ${fmtHours(m.runMin / 60)}</span>
    <span><i style="background:var(--idle)"></i>Idle ${fmtInt(m.idleMin)} min</span><span><i style="background:var(--critical)"></i>Down ${fmtInt(m.downtimeMin)} min</span>`;

  // maintenance
  const mt = $("d-maint");
  updateMetricRow(mt, "total", fmt(m.totalHours, 0), "none", null, "");
  const sinceL = m.hoursSinceService > c.serviceInterval ? "crit" : m.hoursSinceService > c.serviceInterval - 48 ? "warn" : "ok";
  updateMetricRow(mt, "since", fmt(m.hoursSinceService, 0), sinceL, (m.hoursSinceService / c.serviceInterval) * 100, `Service every ${c.serviceInterval} running hours`);
  updateMetricRow(mt, "due", m.serviceDueHours < 0 ? `Overdue ${fmtHours(-m.serviceDueHours)}` : `in ${fmtHours(m.serviceDueHours)}`, sinceL, null, "");
  const wl = m.wear > 0.9 ? "crit" : m.wear > 0.7 ? "warn" : "ok";
  updateMetricRow(mt, "wear", fmt(m.wear * 100, 0), wl, m.wear * 100, "Estimated from load and running hours");
  updateMetricRow(mt, "rul", fmtHours(m.rulHours), rulL || "ok", null, "Running time left before failure is likely");
  const last = state.maintenanceLog.find((e) => e.machineId === id && e.status === "Completed");
  updateMetricRow(mt, "last", last ? `${last.type}, ${timeAgo(last.completedAt)}` : "Not this session", "none", null, "");
}

// ---------- ALERTS ----------
function alertRowHTML(a) {
  const ic = a.severity === "info" ? "info" : "alert";
  const status = a.severity === "info" ? "" :
    `<span class="badge ${a.active ? a.severity : ""}">${a.active ? (a.severity === "critical" ? "Critical" : "Warning") : "Cleared"}</span>`;
  const ack = a.severity !== "info" && !a.acknowledged && can("ack")
    ? `<button class="btn sm" data-ack="${a.id}">${icon("check")}Ack</button>` : "";
  return `<div class="alert-row ${a.active || a.severity === "info" ? "" : "cleared"}">
    <div class="alert-ic ${a.severity}">${icon(ic)}</div>
    <div><div class="alert-msg">${esc(a.message)}</div>
      <div class="alert-meta"><span><b>${esc(a.machineName)}</b></span><span>${esc(a.category)}</span><span>${timeAgo(a.raisedAt)}</span>${a.acknowledged && a.severity !== "info" ? `<span>Acknowledged${a.acknowledgedBy ? " by " + esc(a.acknowledgedBy) : ""}</span>` : ""}</div></div>
    <div class="alert-side">${status}${ack}</div>
  </div>`;
}

function renderAlerts(force) {
  const c = state.plant.alerts;
  $("ak-crit").textContent = c.critical;
  $("ak-warn").textContent = c.warning;
  $("ak-unack").textContent = c.unacknowledged;
  $("ak-total").textContent = state.alerts.filter((a) => a.severity !== "info").length;

  // rebuild the list only when alerts change (keeps buttons clickable), or every 10 s for "x ago"
  const now = Math.floor(Date.now() / 10000);
  const sig = `${state.alertsVersion}|${state.alertFilter}|${state.alertMachine}|${now}`;
  if (!force && state.built.alertSig === sig) return;
  state.built.alertSig = sig;

  const f = state.alertFilter;
  const list = state.alerts.filter((a) => {
    if (state.alertMachine && a.machineId !== state.alertMachine) return false;
    if (f === "active") return a.active;
    if (f === "unack") return !a.acknowledged && a.severity !== "info";
    if (f === "critical") return a.severity === "critical";
    if (f === "warning") return a.severity === "warning";
    if (f === "events") return a.severity === "info";
    return true;
  });
  $("alert-list").innerHTML = list.length ? list.slice(0, 150).map(alertRowHTML).join("")
    : `<div class="empty">Nothing here. ${f === "active" ? "All machines are within limits." : ""}</div>`;
}

// ---------- MAINTENANCE ----------
function renderMaintenance(force) {
  machineIds().forEach((id) => {
    const m = state.machines[id], c = machineCfg(id);
    const row = document.querySelector(`#maint-body tr[data-id="${id}"]`);
    const q = (k) => row.querySelector(`[data-c="${k}"]`);
    q("state").className = `badge ${m.state}`;
    q("state").textContent = STATE_LABEL[m.state];
    q("total").textContent = `${fmtInt(m.totalHours)} h`;
    const sl = m.hoursSinceService > c.serviceInterval ? "crit" : m.hoursSinceService > c.serviceInterval - 48 ? "warn" : "ok";
    q("svcbar").style.width = `${Math.min(100, (m.hoursSinceService / c.serviceInterval) * 100)}%`;
    q("svcbar").className = `bar-fill ${sl}`;
    q("svc").textContent = `${fmtInt(m.hoursSinceService)} h`;
    q("due").innerHTML = m.serviceDueHours < 0
      ? `<span class="badge crit">Overdue ${fmtHours(-m.serviceDueHours)}</span>`
      : sl === "warn" ? `<span class="badge warn">${fmtHours(m.serviceDueHours)}</span>` : fmtHours(m.serviceDueHours);
    const wl = m.wear > 0.9 ? "crit" : m.wear > 0.7 ? "warn" : "ok";
    q("wearbar").style.width = `${Math.min(100, m.wear * 100)}%`;
    q("wearbar").className = `bar-fill ${wl}`;
    q("wear").textContent = `${fmt(m.wear * 100, 0)}%`;
    q("rul").textContent = fmtHours(m.rulHours);
    q("health").textContent = `${fmt(m.health, 0)}%`;
    const btn = row.querySelector("button");
    btn.hidden = !can("maintenance");
    btn.disabled = m.state === "MAINTENANCE";
    btn.textContent = m.state === "MAINTENANCE" ? `In service ${fmtDur(m.maintenanceUntil - Date.now())}` : m.state === "FAULT" ? "Repair" : "Service";
    btn.className = `btn sm ${m.state === "FAULT" || sl !== "ok" ? "primary" : ""}`;
  });

  if (force || state.built.maintV !== state.maintVersion) {
    state.built.maintV = state.maintVersion;
    const log = state.maintenanceLog;
    $("maint-log").innerHTML = log.length ? log.map((e) => `<div class="log-item">
        <span class="badge ${e.status === "Completed" ? "ok" : "MAINTENANCE"}">${esc(e.status)}</span>
        <div><b>${esc(e.machineName)}</b> · ${esc(e.type)} maintenance
          <div class="muted" style="font-size:12px">${esc(e.reason)}${e.note ? " · " + esc(e.note) : ""}${e.startedBy ? " · by " + esc(e.startedBy) : ""}</div>
          ${e.actions ? `<div class="log-actions">${e.actions.map((a) => `<span class="tag">${esc(a)}</span>`).join("")}</div>` : ""}</div>
        <div class="muted num" style="font-size:12px;text-align:right">${new Date(e.startedAt).toLocaleTimeString("en-GB")}<br>${e.durationMin} min · at ${fmtInt(e.hoursAtService)} h</div>
      </div>`).join("")
      : `<div class="empty">No maintenance yet this session. Use <b>Service</b> above, or open a machine and start maintenance.</div>`;
  }
}

// ---------- AI ----------
function renderAI(force) {
  const online = state.plant.ai.online;
  const sig = `${online}|${!!state.modelInfo}`;
  if (force || state.built.aiSig !== sig) {
    state.built.aiSig = sig;
    $("model-status").innerHTML = `<div class="big-ic">${icon("cpu")}</div>
      <div><div class="card-title">${online ? "Random Forest model online" : "AI model offline"}</div>
      <div class="card-sub">${online
        ? "Predictions come from the trained scikit-learn model (Python Flask service, port 8000)."
        : "Start it with <code>python app.py</code> in backend/ml-model. Until then a rule-based estimate from the health score is used."}</div>
      <div style="margin-top:6px"><span class="badge ${online ? "ok" : "warn"}">${online ? "Live predictions" : "Using estimate"}</span></div></div>`;

    const feats = online && state.modelInfo && state.modelInfo.features;
    $("feature-imp").innerHTML = feats
      ? feats.map((f, i) => `<div class="oee-row" style="grid-template-columns:100px 1fr 48px;margin-bottom:8px">
          <span style="text-transform:capitalize">${esc(f.name)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${f.importance * 100}%;background:var(--s${i + 1})"></div></div>
          <b class="num">${fmt(f.importance * 100, 0)}%</b></div>`).join("") +
        `<div class="card-sub" style="margin-top:6px">Feature importance of the trained model</div>`
      : `<div class="card-sub">Feature importance appears when the AI model is online.</div>`;
  }

  machineIds().forEach((id) => {
    const m = state.machines[id];
    const row = document.querySelector(`#risk-list [data-id="${id}"]`);
    const l = riskLevel(m.failureProbability);
    const bar = row.querySelector('[data-c="bar"]');
    bar.style.width = `${m.failureProbability * 100}%`;
    bar.className = `bar-fill ${l}`;
    row.querySelector('[data-c="pct"]').textContent = pct(m.failureProbability);
    const lv = row.querySelector('[data-c="level"]');
    lv.className = `badge ${m.state === "FAULT" ? "crit" : m.state === "MAINTENANCE" ? "MAINTENANCE" : l}`;
    lv.textContent = m.state === "FAULT" ? "Failed" : m.state === "MAINTENANCE" ? "In service" : l === "crit" ? "High risk" : l === "warn" ? "Elevated" : "Low risk";
  });
}

// ---------- ENERGY ----------
function renderEnergy() {
  const p = state.plant, ms = machineIds().map((id) => state.machines[id]);
  const avgPf = ms.filter((m) => m.state === "RUNNING").reduce((a, m, _, arr) => a + m.powerFactor / arr.length, 0);
  $("ek-tp").innerHTML = `${fmt(p.totalPower, 1)}<small>kW</small>`;
  $("ek-tp-f").textContent = `${p.running} of ${p.machinesTotal} machines running`;
  $("ek-en").innerHTML = `${fmtInt(p.energyKWh)}<small>kWh</small>`;
  $("ek-en-f").textContent = p.good > 0 ? `${fmt(p.energyKWh / p.good, 2)} kWh per good part` : "";
  $("ek-cost").innerHTML = `₹${fmtInt(p.energyCost)}`;
  $("ek-cost-f").textContent = `at ₹${state.config.tariff}/kWh`;
  $("ek-pf").innerHTML = avgPf ? fmt(avgPf, 2) : "-";
  $("ek-pf-f").textContent = avgPf && avgPf < 0.85 ? "Below 0.85 - consider power factor correction" : "Running machines";

  const totalE = Math.max(0.001, p.energyKWh);
  ms.forEach((m) => {
    const row = document.querySelector(`#energy-body tr[data-id="${m.id}"]`);
    const q = (k) => row.querySelector(`[data-c="${k}"]`);
    q("v").textContent = `${fmt(m.voltage, 0)} V`;
    q("i").textContent = `${fmt(m.current, 1)} A`;
    q("p").textContent = `${fmt(m.power, 2)} kW`;
    q("pf").textContent = fmt(m.powerFactor, 2);
    q("e").textContent = `${fmt(m.energyKWh, 1)} kWh`;
    q("c").textContent = `₹${fmtInt(m.energyCost)}`;
    const share = (m.energyKWh / totalE) * 100;
    q("sharebar").style.width = `${share}%`;
    q("share").textContent = `${fmt(share, 0)}%`;
  });
}

// ---------- HISTORY ----------
async function loadHistory() {
  const id = $("hist-machine").value;
  const limit = $("hist-limit").value;
  try {
    const res = await authFetch(`/api/history?limit=${limit}${id ? `&machineId=${id}` : ""}`);
    const d = await res.json();
    state.historyRows = d.rows || [];
    $("hist-source").textContent = d.source === "database" ? "Source: MongoDB" : "Source: server memory (connect MongoDB to keep history)";
  } catch (e) {
    state.historyRows = [];
    $("hist-source").textContent = "Backend not reachable";
  }
  renderHistoryTable();
}
function renderHistoryTable() {
  const rows = state.historyRows;
  const name = (id) => (state.config ? (machineCfg(id) || {}).name : id) || id;
  $("hist-body").innerHTML = rows.length ? rows.map((r) => `<tr>
      <td class="num">${new Date(r.createdAt).toLocaleTimeString("en-GB")}</td><td>${esc(r.machineName || name(r.machineId))}</td>
      <td><span class="badge ${r.state}">${STATE_LABEL[r.state] || r.state || "-"}</span></td>
      <td class="r num">${fmt(r.temperature, 1)}</td><td class="r num">${fmt(r.vibration, 2)}</td><td class="r num">${fmtInt(r.rpm)}</td>
      <td class="r num">${fmt(r.load, 0)}</td><td class="r num">${fmt(r.power, 2)}</td><td class="r num">${fmt(r.current, 1)}</td>
      <td class="r num">${fmtInt(r.parts)}</td><td class="r num">${r.oee != null ? fmt(r.oee * 100, 1) + "%" : "-"}</td>
      <td class="r num">${fmt(r.health, 0)}%</td><td class="r num">${pct(r.failureProbability)}</td></tr>`).join("")
    : `<tr><td colspan="13"><div class="empty">No stored readings yet. Snapshots are saved every 10 seconds.</div></td></tr>`;
}
function exportCSV() {
  const rows = state.historyRows;
  if (!rows.length) return toast({ severity: "warning", machineName: "Export", message: "No rows to export" });
  const cols = ["createdAt", "machineId", "machineName", "state", "temperature", "vibration", "rpm", "load", "pressure", "oilLevel",
    "voltage", "current", "power", "powerFactor", "energyKWh", "parts", "rejects", "oee", "health", "failureProbability"];
  const csv = [cols.join(",")].concat(rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `machine-history-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ------------------------------------------------------------
// TOASTS
// ------------------------------------------------------------
function toast(a) {
  const box = $("toasts");
  const el = document.createElement("div");
  el.className = `toast ${a.severity}`;
  if (a.severity === "info") el.style.borderLeftColor = "var(--accent)";
  el.innerHTML = `<div class="alert-ic ${a.severity}">${icon(a.severity === "info" ? "info" : "alert")}</div>
    <div><div class="toast-title">${esc(a.machineName)}</div><div class="toast-msg">${esc(a.message)}</div></div>
    <button class="toast-close" aria-label="Dismiss">${icon("x")}</button>`;
  el.querySelector("button").onclick = () => el.remove();
  box.prepend(el);
  while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => el.remove(), 7000);
}

// ------------------------------------------------------------
// EVENTS
// ------------------------------------------------------------
function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach((b) => (b.onclick = () => showPage(b.dataset.page)));
  document.querySelectorAll("[data-goto]").forEach((b) => (b.onclick = () => showPage(b.dataset.goto)));
  $("bell-btn").onclick = () => showPage("alerts");
  $("theme-btn").onclick = () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  $("menu-btn").onclick = () => document.body.classList.add("nav-open");
  $("backdrop").onclick = () => document.body.classList.remove("nav-open");

  $("machine-grid").addEventListener("click", (e) => {
    const card = e.target.closest(".m-card");
    if (card) openMachine(card.dataset.id);
  });
  $("machine-grid").addEventListener("keydown", (e) => {
    const card = e.target.closest(".m-card");
    if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openMachine(card.dataset.id); }
  });
  $("machine-tabs").addEventListener("click", (e) => {
    const t = e.target.closest(".m-tab");
    if (t) openMachine(t.dataset.id);
  });
  $("trend-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.trendMetric = b.dataset.k;
    $("trend-seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    updateCharts();
  });

  $("fault-btn").onclick = async () => {
    const r = await api(`/api/machines/${state.selected}/fault`, { mode: $("fault-select").value });
    if (r) toast({ severity: "warning", machineName: machineCfg(state.selected).name, message: `${$("fault-select").selectedOptions[0].text} fault injected. Watch the readings change.` });
  };
  $("maint-btn").onclick = () => api(`/api/machines/${state.selected}/maintenance`, {});
  $("maint-body").addEventListener("click", (e) => {
    const b = e.target.closest('[data-action="maint"]');
    if (b && !b.disabled) api(`/api/machines/${b.dataset.id}/maintenance`, {});
  });

  $("alert-filter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.alertFilter = b.dataset.f;
    $("alert-filter").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    renderAlerts(true);
  });
  $("alert-machine").onchange = (e) => { state.alertMachine = e.target.value; renderAlerts(true); };
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-ack]");
    if (b) { b.disabled = true; await api(`/api/alerts/${b.dataset.ack}/ack`, {}); }
  });
  $("ack-all-btn").onclick = () => api("/api/alerts/ack-all", {});

  $("hist-refresh").onclick = loadHistory;
  $("hist-machine").onchange = loadHistory;
  $("hist-limit").onchange = loadHistory;
  $("hist-export").onclick = exportCSV;

  window.addEventListener("hashchange", readHash);
}

function readHash() {
  const [page, id] = location.hash.replace("#", "").split("/");
  if (page === "machine" && id) state.selected = id.toUpperCase();
  if (page && PAGES[page] && page !== state.page) showPage(page, false);
}

// ------------------------------------------------------------
// START
// ------------------------------------------------------------
// ------------------------------------------------------------
// LOGIN / LOGOUT / ROLES
// ------------------------------------------------------------
function applyRole() {
  const u = state.user;
  if (!u) return;
  $("user-name").textContent = u.name;
  $("user-role").textContent = u.roleLabel;
  $("user-avatar").textContent = u.name.split("(")[0].trim().split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  $("user-chip").title = `Signed in as ${u.username} (${u.roleLabel})`;
  // show/hide anything marked with data-perm / data-perm-not
  document.querySelectorAll("[data-perm]").forEach((el) => el.toggleAttribute("data-perm-hidden", !can(el.dataset.perm)));
  document.querySelectorAll("[data-perm-not]").forEach((el) => el.toggleAttribute("data-perm-hidden", can(el.dataset.permNot)));
  $("ack-all-btn").hidden = !can("ack");
}

function showLogin(message = "") {
  document.body.classList.add("logged-out");
  $("login-error").textContent = message;
  setTimeout(() => $("login-user").focus(), 50);
}

async function startSession() {
  document.body.classList.remove("logged-out");
  applyRole();
  readHash();
  if (typeof Chart === "undefined") {
    $("conn-banner").innerHTML = `${icon("alert")}<div><b>Chart library failed to load.</b> Check your internet connection (Chart.js loads from a CDN) and refresh.</div>`;
    $("conn-banner").classList.add("show");
    return;
  }
  connect();
}

function logout(message = "") {
  state.user = null;
  setToken(null);
  clearTimeout(reconnectTimer);
  if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} }
  state.connected = false;
  state.everConnected = false;
  state.config = null;
  state.plant = null;
  $("login-pass").value = "";
  showLogin(message);
}

async function doLogin(e) {
  e.preventDefault();
  const btn = $("login-btn");
  btn.disabled = true;
  btn.textContent = "Signing in...";
  $("login-error").textContent = "";
  try {
    const res = await fetch(API_BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: $("login-user").value, password: $("login-pass").value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Sign in failed");
    setToken(data.token);
    state.user = data.user;
    $("login-pass").value = "";
    startSession();
  } catch (err) {
    $("login-error").textContent = err.message === "Failed to fetch"
      ? "Cannot reach the backend. Start it with: cd backend, then npm start."
      : err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
}

async function restoreSession() {
  if (!getToken()) return showLogin();
  try {
    const res = await fetch(API_BASE + "/api/auth/me", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) { setToken(null); return showLogin(res.status === 401 ? "Please sign in." : ""); }
    state.user = (await res.json()).user;
    startSession();
  } catch (e) {
    showLogin("Cannot reach the backend. Start it with: cd backend, then npm start.");
  }
}

$("login-form").addEventListener("submit", doLogin);
$("pass-toggle").onclick = () => {
  const p = $("login-pass");
  p.type = p.type === "password" ? "text" : "password";
  $("pass-toggle").textContent = p.type === "password" ? "Show" : "Hide";
};
document.querySelectorAll(".demo-acc").forEach((b) => (b.onclick = () => {
  $("login-user").value = b.dataset.u;
  $("login-pass").value = b.dataset.p;
  $("login-btn").focus();
}));
$("logout-btn").onclick = () => logout("You have signed out.");

// ------------------------------------------------------------
// START
// ------------------------------------------------------------
document.body.classList.add("logged-out");
fillIcons();
bindEvents();
updateConnectionUI();
restoreSession();
// keep "x seconds ago" and countdowns fresh even between ticks
setInterval(() => { if (!state.connected) updateConnectionUI(); }, 2000);
