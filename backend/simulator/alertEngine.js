// ============================================================
// ALERT ENGINE
// Evaluates every machine against its own nominal values each tick.
// Uses hysteresis (a condition must hold for a few ticks before an alert
// is raised, and be gone for a few ticks before it clears) so alerts
// don't flicker on sensor noise.
// ============================================================
const RAISE_AFTER = 3; // ticks
const CLEAR_AFTER = 5; // ticks
const MAX_ALERTS = 300;

let nextId = 1;

const fmt = (v, d = 1) => Number(v).toFixed(d);

// Returns the list of conditions currently true for a machine
function evaluate(m) {
  const n = m.cfg.nominal;
  const out = [];
  const running = m.state === "RUNNING";

  if (m.state === "FAULT") {
    out.push({ key: "trip", severity: "critical", category: "State",
      message: `Machine tripped${m.diagnosis ? ` - ${m.diagnosis}` : ""}. Maintenance required.` });
  }

  if (m.temperature > n.temperature + 30) {
    out.push({ key: "temp", severity: "critical", category: "Mechanical",
      message: `Temperature critical: ${fmt(m.temperature)} °C (normal ${n.temperature} °C)` });
  } else if (m.temperature > n.temperature + 15) {
    out.push({ key: "temp", severity: "warning", category: "Mechanical",
      message: `Temperature high: ${fmt(m.temperature)} °C (normal ${n.temperature} °C)` });
  }

  if (running && m.vibration > n.vibration * 2.5) {
    out.push({ key: "vib", severity: "critical", category: "Mechanical",
      message: `Vibration critical: ${fmt(m.vibration, 2)} mm/s (normal ${n.vibration} mm/s)` });
  } else if (running && m.vibration > n.vibration * 1.6) {
    out.push({ key: "vib", severity: "warning", category: "Mechanical",
      message: `Vibration elevated: ${fmt(m.vibration, 2)} mm/s (normal ${n.vibration} mm/s)` });
  }

  if (running) {
    const dev = Math.abs(m.pressure - n.pressure) / n.pressure;
    if (dev > 0.3) {
      out.push({ key: "pressure", severity: "critical", category: "Mechanical",
        message: `${m.cfg.pressureLabel} abnormal: ${fmt(m.pressure)} bar (normal ${n.pressure} bar)` });
    } else if (dev > 0.15) {
      out.push({ key: "pressure", severity: "warning", category: "Mechanical",
        message: `${m.cfg.pressureLabel} off target: ${fmt(m.pressure)} bar (normal ${n.pressure} bar)` });
    }
  }

  if (m.oilLevel < 10) {
    out.push({ key: "oil", severity: "critical", category: "Mechanical",
      message: `Lubricant level critical: ${fmt(m.oilLevel, 0)}%` });
  } else if (m.oilLevel < 25) {
    out.push({ key: "oil", severity: "warning", category: "Mechanical",
      message: `Lubricant level low: ${fmt(m.oilLevel, 0)}% - top up soon` });
  }

  const vDev = Math.abs(m.voltage - n.voltage) / n.voltage;
  if (running && vDev > 0.1) {
    out.push({ key: "voltage", severity: "critical", category: "Electrical",
      message: `Supply voltage out of range: ${fmt(m.voltage, 0)} V (nominal ${n.voltage} V)` });
  } else if (running && vDev > 0.05) {
    out.push({ key: "voltage", severity: "warning", category: "Electrical",
      message: `Supply voltage deviation: ${fmt(m.voltage, 0)} V (nominal ${n.voltage} V)` });
  }

  if (running && m.powerFactor < 0.72) {
    out.push({ key: "pf", severity: "warning", category: "Electrical",
      message: `Low power factor: ${fmt(m.powerFactor, 2)} - check motor windings / capacitors` });
  }

  if (running && m.failureProbability > 0.8) {
    out.push({ key: "ai", severity: "critical", category: "AI Prediction",
      message: `AI predicts failure risk ${fmt(m.failureProbability * 100, 0)}% - plan corrective maintenance` });
  } else if (running && m.failureProbability > 0.5) {
    out.push({ key: "ai", severity: "warning", category: "AI Prediction",
      message: `AI predicts elevated failure risk ${fmt(m.failureProbability * 100, 0)}%` });
  }

  if (m.state !== "MAINTENANCE") {
    if (m.serviceDueHours < 0) {
      out.push({ key: "service", severity: "critical", category: "Maintenance",
        message: `Preventive service overdue by ${fmt(-m.serviceDueHours, 0)} h` });
    } else if (m.serviceDueHours < 48) {
      out.push({ key: "service", severity: "warning", category: "Maintenance",
        message: `Preventive service due in ${fmt(m.serviceDueHours, 0)} h` });
    }
  }

  return out;
}

class AlertEngine {
  constructor(onChange) {
    this.alerts = [];          // newest first
    this.active = new Map();   // `${machineId}:${key}` -> alert
    this.pending = new Map();  // condition counters
    this.onChange = onChange;  // (alert) => void
  }

  info(machine, message, category = "Event") {
    this._push({
      machineId: machine ? machine.cfg.id : "PLANT",
      machineName: machine ? machine.cfg.name : "Plant",
      key: "event", severity: "info", category, message,
      active: false, acknowledged: true,
    });
  }

  _push(data) {
    const alert = { id: nextId++, raisedAt: new Date().toISOString(), clearedAt: null, ...data };
    this.alerts.unshift(alert);
    if (this.alerts.length > MAX_ALERTS) this.alerts.pop();
    this.onChange(alert);
    return alert;
  }

  update(machines) {
    const seen = new Set();

    machines.forEach((m) => {
      evaluate(m).forEach((c) => {
        const k = `${m.cfg.id}:${c.key}`;
        seen.add(k);
        const p = this.pending.get(k) || { hits: 0, misses: 0 };
        p.hits++; p.misses = 0;
        this.pending.set(k, p);

        const existing = this.active.get(k);
        if (existing) {
          // keep the latest reading in the message (same severity only)
          if (existing.severity === c.severity) existing.message = c.message;
          if (existing.severity === "warning" && c.severity === "critical") {
            // escalate: clear the warning, raise a new critical
            this._clear(k, existing);
            this._raise(k, m, c);
          }
        } else if (p.hits >= RAISE_AFTER || c.key === "trip") {
          this._raise(k, m, c);
        }
      });
    });

    // Clear conditions that have gone away
    for (const [k, p] of this.pending) {
      if (seen.has(k)) continue;
      p.hits = 0; p.misses++;
      const existing = this.active.get(k);
      if (existing && p.misses >= CLEAR_AFTER) this._clear(k, existing);
      if (!existing) this.pending.delete(k);
    }
  }

  _raise(k, m, c) {
    const alert = this._push({
      machineId: m.cfg.id, machineName: m.cfg.name,
      key: c.key, severity: c.severity, category: c.category, message: c.message,
      active: true, acknowledged: false,
    });
    this.active.set(k, alert);
  }

  _clear(k, alert) {
    alert.active = false;
    alert.clearedAt = new Date().toISOString();
    this.active.delete(k);
    this.onChange(alert);
  }

  acknowledge(id, by = "") {
    const a = this.alerts.find((x) => x.id === Number(id));
    if (!a) return null;
    a.acknowledged = true;
    a.acknowledgedAt = new Date().toISOString();
    a.acknowledgedBy = by;
    this.onChange(a);
    return a;
  }

  acknowledgeAll(by = "") {
    this.alerts.forEach((a) => {
      if (!a.acknowledged) {
        a.acknowledged = true;
        a.acknowledgedAt = new Date().toISOString();
        a.acknowledgedBy = by;
        this.onChange(a);
      }
    });
  }

  counts() {
    const c = { critical: 0, warning: 0, unacknowledged: 0 };
    this.alerts.forEach((a) => {
      if (a.active && a.severity === "critical") c.critical++;
      if (a.active && a.severity === "warning") c.warning++;
      if (!a.acknowledged && a.severity !== "info") c.unacknowledged++;
    });
    return c;
  }
}

module.exports = AlertEngine;
