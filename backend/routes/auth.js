const express = require('express');
const router = express.Router();
const { register, login, verifyOtp } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);   // ← add this line

module.exports = router;
