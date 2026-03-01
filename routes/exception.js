const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const exception = require('../controllers/exceptionController');

router.post('/requests/:id/exception', authMiddleware, exception.raiseException);
router.get('/manager', authMiddleware, exception.viewExceptions);

module.exports = router;
