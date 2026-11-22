// ============================================================
// Create a user or change a password
//
//   node scripts/createUser.js <username> <password> <role> "<Full name>"
//
// role = operator | maintenance | manager
// Example:
//   node scripts/createUser.js yash MyStrongPass1 manager "Yash"
//
// Disable an account:
//   node scripts/createUser.js <username> --disable
// ============================================================
const { loadUsers, saveUsers, hashPassword, PERMISSIONS } = require("../auth/auth");

const [username, password, role, name] = process.argv.slice(2);

if (!username || !password) {
  console.log('Usage: node scripts/createUser.js <username> <password> <operator|maintenance|manager> "<Full name>"');
  process.exit(1);
}

const users = loadUsers();
const uname = username.trim().toLowerCase();
const existing = users.find((u) => u.username === uname);

if (password === "--disable") {
  if (!existing) { console.log(`No user "${uname}"`); process.exit(1); }
  existing.active = false;
  saveUsers(users);
  console.log(`Disabled ${uname}`);
  process.exit(0);
}

if (password.length < 8) {
  console.log("Password must be at least 8 characters");
  process.exit(1);
}

const finalRole = role || (existing && existing.role);
if (!PERMISSIONS[finalRole]) {
  console.log("Role must be one of: operator, maintenance, manager");
  process.exit(1);
}

const { salt, hash } = hashPassword(password);
if (existing) {
  Object.assign(existing, { salt, hash, role: finalRole, name: name || existing.name, active: true });
  console.log(`Updated ${uname} (${finalRole})`);
} else {
  users.push({ username: uname, name: name || username, role: finalRole, salt, hash, active: true });
  console.log(`Created ${uname} (${finalRole})`);
}
saveUsers(users);
