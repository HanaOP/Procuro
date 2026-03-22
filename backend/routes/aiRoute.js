const express = require('express');
const router = express.Router();
const { chatHandler } = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleMiddleware');


router.post('/chat',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  chatHandler
);
module.exports = router;