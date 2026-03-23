/**
 * predictionService.js
 * Calls the Python FastAPI AI service running on port 8001
 */

const axios = require('axios');

const BASE = process.env.PREDICTION_SERVICE_URL || 'http://localhost:8001';

async function callPrediction(endpoint) {
  try {
    const res = await axios.get(`${BASE}${endpoint}`, { timeout: 120000 });
    return { success: true, data: res.data };
  } catch (err) {
    const message = err.response?.data?.detail || err.message || 'Prediction service error';
    return { success: false, error: message };
  }
}

// ── Demand Predictions ────────────────────────────────────────────────────────
async function getAllPredictions()                  { return callPrediction('/predict/all'); }
async function getPredictionsByDepartment(dept)    { return callPrediction(`/predict/department/${encodeURIComponent(dept)}`); }
async function getPredictionsByCategory(cat)       { return callPrediction(`/predict/category/${encodeURIComponent(cat)}`); }

// ── Spend Forecasting (Prophet ML) ───────────────────────────────────────────
async function getSpendForecast()                  { return callPrediction('/forecast/spend'); }
async function getSpendForecastByDepartment(dept)  { return callPrediction(`/forecast/spend/${encodeURIComponent(dept)}`); }

// ── Anomaly Detection (Isolation Forest ML) ──────────────────────────────────
async function getAllAnomalies()                    { return callPrediction('/anomalies/all'); }
async function getAnomaliesByDepartment(dept)      { return callPrediction(`/anomalies/department/${encodeURIComponent(dept)}`); }

// ── Summary ───────────────────────────────────────────────────────────────────
async function getBudgetForecast()                 { return callPrediction('/forecast/spend'); }
async function getTopItems(limit = 10)             { return callPrediction(`/summary/top-items?limit=${limit}`); }
async function getReorderAlerts()                  { return callPrediction('/summary/reorder-alerts'); }

// ── Combined Dashboard ────────────────────────────────────────────────────────
async function getDepartmentDashboard(dept)        { return callPrediction(`/summary/dashboard/${encodeURIComponent(dept)}`); }

module.exports = {
  getAllPredictions,
  getPredictionsByDepartment,
  getPredictionsByCategory,
  getSpendForecast,
  getSpendForecastByDepartment,
  getAllAnomalies,
  getAnomaliesByDepartment,
  getBudgetForecast,
  getTopItems,
  getReorderAlerts,
  getDepartmentDashboard,
};