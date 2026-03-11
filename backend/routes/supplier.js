const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/rfqs', supplierController.viewOpenRFQs);
router.post('/quotation', supplierController.submitQuotation);
router.get('/my-quotations', supplierController.myQuotations);

module.exports = router;