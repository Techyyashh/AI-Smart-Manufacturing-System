// ============================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL
//  - Passwords stored as salted scrypt hashes (never plain text)
//  - Login returns a signed JWT (HS256), valid for one 12-hour shift
//  - Every API route checks the user's role before it runs
//  - Repeated wrong passwords are blocked for 5 minutes
// Uses only Node's built-in crypto module (no extra packages).
// ============================================================
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "users.json");
const TOKEN_HOURS = 12;

// What each role is allowed to do
const PERMISSIONS = {
  operator: ["view", "ack"],
  maintenance: ["view", "ack", "maintenance", "history"],
  manager: ["view", "ack", "maintenance", "history", "energy", "demo", "shift", "export"],
};

const ROLE_LABELS = { operator: "Operator", maintenance: "Maintenance", manager: "Manager" };

// Signing key for login tokens. Set JWT_SECRET in .env so logins survive a restart.
const usingTempSecret = !process.env.JWT_SECRET;
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// ---------- users ----------
function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch (e) {
    console.log("Could not read auth/users.json:", e.message);
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(user.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- JWT (HS256) ----------
const b64url = (buf) => Buffer.from(buf).toString("base64url");

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_HOURS * 3600 }));
  const sig = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

const publicUser = (u) => ({
  username: u.username,
  name: u.name,
  role: u.role,
  roleLabel: ROLE_LABELS[u.role] || u.role,
  permissions: PERMISSIONS[u.role] || [],
});

// ---------- brute-force protection ----------
const failed = new Map(); // key -> { count, until }
const MAX_TRIES = 5;
const LOCK_MS = 5 * 60 * 1000;

function isLocked(key) {
  const f = failed.get(key);
  return f && f.until > Date.now();
}
function recordFail(key) {
  const f = failed.get(key) || { count: 0, until: 0 };
  f.count++;
  if (f.count >= MAX_TRIES) { f.until = Date.now() + LOCK_MS; f.count = 0; }
  failed.set(key, f);
}

// ---------- route handlers & middleware ----------
function login(req, res) {
  const username = String((req.body && req.body.username) || "").trim().toLowerCase();
  const password = String((req.body && req.body.password) || "");
  const key = `${req.ip}|${username}`;

  if (isLocked(key)) {
    return res.status(429).json({ error: "Too many failed attempts. Try again in 5 minutes." });
  }
  const user = loadUsers().find((u) => u.username === username && u.active !== false);
  if (!user || !verifyPassword(password, user)) {
    recordFail(key);
    return res.status(401).json({ error: "Wrong username or password" });
  }
  failed.delete(key);
  const token = signToken({ sub: user.username, name: user.name, role: user.role });
  console.log(`Login: ${user.name} (${ROLE_LABELS[user.role]})`);
  res.json({ token, user: publicUser(user) });
}

function me(req, res) {
  const user = loadUsers().find((u) => u.username === req.user.sub);
  if (!user) return res.status(401).json({ error: "User no longer exists" });
  res.json({ user: publicUser(user) });
}

function readToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

// Require a valid login
function requireAuth(req, res, next) {
  const payload = verifyToken(readToken(req));
  if (!payload) return res.status(401).json({ error: "Please log in" });
  req.user = payload;
  next();
}

// Require a specific permission, e.g. requirePermission("maintenance")
function requirePermission(permission) {
  return (req, res, next) => {
    const perms = PERMISSIONS[req.user.role] || [];
    if (!perms.includes(permission)) {
      return res.status(403).json({
        error: `Your role (${ROLE_LABELS[req.user.role] || req.user.role}) is not allowed to do this`,
      });
    }
    next();
  };
}

module.exports = {
  usingTempSecret,
  PERMISSIONS,
  ROLE_LABELS,
  loadUsers,
  saveUsers,
  hashPassword,
  verifyToken,
  login,
  me,
  requireAuth,
  requirePermission,
};
