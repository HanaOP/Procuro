/**
 * predictionRoutes.js
 * Mounted at /api/predictions in index.js
 */

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { allowRoles }     = require('../middleware/roleMiddleware');
const {
  getAllPredictions,
  getPredictionsByDepartment,
  getPredictionsByCategory,
  getBudgetForecast,
  getTopItems,
  getReorderAlerts,
  getSpendForecast,
  getSpendForecastByDepartment,
  getAllAnomalies,
  getAnomaliesByDepartment,
  getDepartmentDashboard,
} = require('../predictionService');


// ── DEMAND PREDICTIONS ────────────────────────────────────────────────────────

// GET /api/predictions/all
router.get('/all',
  authMiddleware,
  allowRoles('PROCUREMENT', 'FINANCE', 'MANAGER'),
  async (req, res) => {
    const result = await getAllPredictions();
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);

// GET /api/predictions/department/:department
router.get('/department/:department',
  authMiddleware,
  allowRoles('MANAGER', 'PROCUREMENT', 'FINANCE'),
  async (req, res) => {
    const { department } = req.params;
    if (req.user.role === 'MANAGER' && req.user.department !== department) {
      return res.status(403).json({ error: 'You can only view your own department predictions' });
    }
    const result = await getPredictionsByDepartment(department);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);

// GET /api/predictions/my-department
// Manager shortcut — uses department from JWT automatically
router.get('/my-department',
  authMiddleware,
  allowRoles('MANAGER'),
  async (req, res) => {
    const department = req.user.department;
    if (!department) return res.status(400).json({ error: 'No department in your account' });
    const result = await getPredictionsByDepartment(department);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);

// GET /api/predictions/category/:category
router.get('/category/:category',
  authMiddleware,
  allowRoles('PROCUREMENT', 'FINANCE', 'MANAGER'),
  async (req, res) => {
    const result = await getPredictionsByCategory(req.params.category);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);


// ── SPEND FORECASTING (Prophet ML) ───────────────────────────────────────────

// GET /api/predictions/forecast/spend
// All departments — for Finance dashboard
router.get('/forecast/spend',
  authMiddleware,
  allowRoles('FINANCE', 'PROCUREMENT'),
  async (req, res) => {
    const result = await getSpendForecast();
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);

// GET /api/predictions/forecast/spend/:department
// Single department — for Manager dashboard
router.get('/forecast/spend/:department',
  authMiddleware,
  allowRoles('MANAGER', 'FINANCE', 'PROCUREMENT'),
  async (req, res) => {
    const { department } = req.params;
    if (req.user.role === 'MANAGER' && req.user.department !== department) {
      return res.status(403).json({ error: 'You can only view your own department forecast' });
    }
    const result = await getSpendForecastByDepartment(department);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);


// ── ANOMALY DETECTION (Isolation Forest ML) ───────────────────────────────────

// GET /api/predictions/anomalies/all
// All anomalies — for Procurement dashboard
router.get('/anomalies/all',
  authMiddleware,
  allowRoles('PROCUREMENT', 'FINANCE', 'MANAGER'),
  async (req, res) => {
    const result = await getAllAnomalies();
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);

// GET /api/predictions/anomalies/:department
// Department anomalies — for Manager dashboard
router.get('/anomalies/:department',
  authMiddleware,
  allowRoles('MANAGER', 'PROCUREMENT', 'FINANCE'),
  async (req, res) => {
    const { department } = req.params;
    if (req.user.role === 'MANAGER' && req.user.department !== department) {
      return res.status(403).json({ error: 'You can only view your own department anomalies' });
    }
    const result = await getAnomaliesByDepartment(department);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);


// ── SUMMARY ENDPOINTS ─────────────────────────────────────────────────────────

// GET /api/predictions/budget-forecast
router.get('/budget-forecast',
  authMiddleware,
  allowRoles('FINANCE', 'PROCUREMENT'),
  async (req, res) => {
    const result = await getBudgetForecast();
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);

// GET /api/predictions/top-items?limit=10
router.get('/top-items',
  authMiddleware,
  allowRoles('PROCUREMENT', 'FINANCE', 'MANAGER'),
  async (req, res) => {
    const limit  = parseInt(req.query.limit) || 10;
    const result = await getTopItems(limit);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);

// GET /api/predictions/reorder-alerts
router.get('/reorder-alerts',
  authMiddleware,
  allowRoles('PROCUREMENT', 'FINANCE', 'MANAGER'),
  async (req, res) => {
    const result = await getReorderAlerts();
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);


// ── MANAGER DASHBOARD (all 3 AI analyses combined) ───────────────────────────

// GET /api/predictions/dashboard/:department
// Returns predictions + spend forecast + anomalies in one call
router.get('/dashboard/:department',
  authMiddleware,
  allowRoles('MANAGER', 'PROCUREMENT', 'FINANCE'),
  async (req, res) => {
    const { department } = req.params;
    if (req.user.role === 'MANAGER' && req.user.department !== department) {
      return res.status(403).json({ error: 'You can only view your own department dashboard' });
    }
    const result = await getDepartmentDashboard(department);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);

// GET /api/predictions/my-dashboard
// Manager shortcut — uses their department from JWT
router.get('/my-dashboard',
  authMiddleware,
  allowRoles('MANAGER'),
  async (req, res) => {
    const department = req.user.department;
    if (!department) return res.status(400).json({ error: 'No department in your account' });
    const result = await getDepartmentDashboard(department);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  }
);


module.exports = router;