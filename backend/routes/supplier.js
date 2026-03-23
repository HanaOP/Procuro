const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const supplierController = require('../controllers/supplierController');
const { authMiddleware } = require('../middleware/auth');

// ── Multer config for PDF uploads ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, 'contract-' + unique + path.extname(file.originalname))
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'), false)
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

router.use(authMiddleware);

router.get('/rfqs',              supplierController.viewOpenRFQs);
router.post('/quotation',        upload.single('contract_document'), supplierController.submitQuotation);
router.get('/my-quotations',     supplierController.myQuotations);
router.get('/selection-status',  supplierController.getMySelectionStatus);
router.get('/orders',            supplierController.getMyOrders);
router.post('/invoice',          upload.single('invoice_document'), supplierController.uploadInvoice);

module.exports = router;
