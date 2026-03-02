const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleMiddleware');
const manager = require('../controllers/managerController');
const { viewExceptions } = require('../controllers/exceptionController');

router.get('/requests/pending',
  authMiddleware,
  allowRoles('MANAGER'),
  manager.pendingRequests
);

router.get('/requests/high-priority',
  authMiddleware,
  allowRoles('MANAGER'),
  manager.highPriority
);

router.get('/requests/rejected',
  authMiddleware,
  allowRoles('MANAGER'),
  manager.rejectedList
);

router.post('/requests/:id/clarify',
  authMiddleware,
  allowRoles('MANAGER'),
  manager.clarify
);

router.put('/requests/:id/approve',
  authMiddleware,
  allowRoles('MANAGER'),
  manager.approve
);

router.post('/requests/:id/reject',
  authMiddleware,
  allowRoles('MANAGER'),
  manager.reject
);

router.get('/requests/approved',
  authMiddleware,
  allowRoles('MANAGER'),
  manager.approvedList
);

router.get('/exceptions',
  authMiddleware,
  allowRoles('MANAGER'),
  viewExceptions
);

module.exports = router;