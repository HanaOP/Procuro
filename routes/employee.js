const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { createRequest, getRequests, getDrafts, getRejected, updateDraft } = require('../controllers/employeeController');

router.post('/requests', authMiddleware, createRequest);
router.get('/requests', authMiddleware, getRequests);
router.get('/requests/drafts', authMiddleware, getDrafts);
router.get('/requests/rejected', authMiddleware, getRejected);
router.put('/requests/:id', authMiddleware, updateDraft);
router.post('/requests/:id/exception', authMiddleware, require('../controllers/exceptionController').raiseException);
router.get('/requests/:id/suggestions', authMiddleware, async (req, res) => {
  const { AIRecommendation } = require('../db');
  try {
    const { user_id, role } = req.user;
    if (role !== 'EMPLOYEE') return res.status(403).json({ error: 'Only employees can view suggestions' });
    const pr_id = req.params.id;
    const suggestions = await AIRecommendation.findAll({ where: { pr_id } });
    return res.json(suggestions);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
