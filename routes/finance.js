const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleMiddleware');
const finance = require('../controllers/financeController');

router.post('/budget',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.addBudget
);

router.get('/requests/pending',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.pendingRequests
);

router.post('/requests/:id/approve',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.approveRequest
);

router.post('/requests/:id/reject',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.rejectRequest
);

module.exports = router;