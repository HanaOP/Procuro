const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleMiddleware');
const procurementController = require('../controllers/procurementController');

console.log('Procurement routes loaded'); // Debug log

// 1. GET approved PRs (finance approved)
router.get('/requests', 
  authMiddleware, 
  allowRoles('PROCUREMENT'), 
  procurementController.getApprovedRequests 
);

// 2. POST send RFQ
router.post('/requests', 
  authMiddleware, 
  allowRoles('PROCUREMENT'), 
  procurementController.sendRFQ 
);

// 3. GET quotations by RFQ ID
router.get('/quotations/:rfq_id', 
  authMiddleware, 
  allowRoles('PROCUREMENT'), 
  procurementController.viewQuotations 
);

// 4. POST select supplier
router.post('/quotations/:quotation_id/select', 
  authMiddleware, 
  allowRoles('PROCUREMENT'), 
  procurementController.selectSupplier 
);

// 5. POST mark delivered
router.post('/purchase-orders/:po_id/mark-delivered', 
  authMiddleware, 
  allowRoles('PROCUREMENT'), 
  procurementController.markDelivered 
);

module.exports = router;
