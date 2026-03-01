const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const finance = require('../controllers/financeController');

router.post('/budget', authMiddleware, finance.addBudget);
router.get('/requests/pending', authMiddleware, finance.pendingRequests);
router.post('/requests/:id/approve', authMiddleware, finance.approveRequest);
router.post('/requests/:id/reject', authMiddleware, finance.rejectRequest);

module.exports = router;
