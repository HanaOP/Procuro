const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleMiddleware');

const {
  createRequest,
  getRequests,
  getDrafts,
  getRejected,
  updateDraft
} = require('../controllers/employeeController');

const { raiseException } = require('../controllers/exceptionController');

router.post('/requests',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  createRequest
);

router.get('/requests',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  getRequests
);

router.get('/requests/drafts',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  getDrafts
);

router.get('/requests/rejected',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  getRejected
);

router.put('/requests/:id',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  updateDraft
);

router.post('/requests/:id/exception',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  raiseException
);

module.exports = router;