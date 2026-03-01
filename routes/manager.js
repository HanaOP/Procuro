const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const manager = require('../controllers/managerController');

router.get('/requests/pending', authMiddleware, manager.pendingRequests);
router.get('/requests/high-priority', authMiddleware, manager.highPriority);
router.get('/requests/rejected', authMiddleware, manager.rejectedList);
router.post('/requests/:id/clarify', authMiddleware, manager.clarify);
router.put('/requests/:id/approve', authMiddleware, manager.approve);
router.post('/requests/:id/reject', authMiddleware, manager.reject);
router.get('/requests/approved', authMiddleware, manager.approvedList);
router.get('/exceptions', authMiddleware, require('../controllers/exceptionController').viewExceptions);

module.exports = router;
