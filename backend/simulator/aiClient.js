// ============================================================
// AI CLIENT
// Talks to the Python Flask service (backend/ml-model/app.py) that serves
// the trained Random Forest failure-prediction model.
// If the service is not running, `online` stays false and the simulator
// falls back to a rule-based estimate.
// ============================================================
const axios = require("axios");

const ML_URL = process.env.ML_URL || "http://localhost:8000";

const aiClient = {
  online: false,
  modelInfo: null,
  inFlight: false,
  lastCheck: 0,

  async predictBatch(featureRows) {
    // While offline, only retry every 10 s
    if (this.inFlight) return null;
    if (!this.online && Date.now() - this.lastCheck < 10000) return null;

    this.inFlight = true;
    this.lastCheck = Date.now();
    try {
      const res = await axios.post(
        `${ML_URL}/predict_batch`,
        { readings: featureRows },
        { timeout: 1500 }
      );
      if (!this.online) {
        console.log("AI model service connected");
        this.loadModelInfo();
      }
      this.online = true;
      return res.data.predictions;
    } catch (error) {
      if (this.online) console.log("AI model service went offline - using rule-based estimate");
      this.online = false;
      return null;
    } finally {
      this.inFlight = false;
    }
  },

  async loadModelInfo() {
    try {
      const res = await axios.get(`${ML_URL}/model-info`, { timeout: 1500 });
      this.modelInfo = res.data;
    } catch (error) {
      /* keep previous info */
    }
  },
};

module.exports = aiClient;
