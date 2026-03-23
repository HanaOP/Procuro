const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { allowRoles }     = require('../middleware/roleMiddleware');
const procurementController      = require('../controllers/procurementController');
const supplierApprovalController = require('../controllers/supplierApprovalController');

console.log('Procurement routes loaded');

// 1. GET approved PRs
router.get('/requests',
  authMiddleware, allowRoles('PROCUREMENT'),
  procurementController.getApprovedRequests
);

router.get('/supplier-classifications',
  authMiddleware, allowRoles('PROCUREMENT'),
  procurementController.getSupplierClassifications
);

// 2. POST send RFQ
router.post('/requests',
  authMiddleware, allowRoles('PROCUREMENT'),
  procurementController.sendRFQ
);

// 3. GET quotations by RFQ ID
router.get('/quotations/:rfq_id',
  authMiddleware, allowRoles('PROCUREMENT'),
  procurementController.viewQuotations
);

// 4. POST select supplier
router.post('/quotations/:quotation_id/select',
  authMiddleware, allowRoles('PROCUREMENT'),
  procurementController.selectSupplier
);

// 5. POST mark delivered
router.post('/purchase-orders/:po_id/mark-delivered',
  authMiddleware, allowRoles('PROCUREMENT'),
  procurementController.markDelivered
);

// ── SUPPLIER APPROVAL ROUTES ──────────────────────────────────────────────────
// IMPORTANT: specific routes MUST come before parameterized routes

// Manager: GET pending approvals (must be before /:approval_id routes)
router.get('/supplier-approvals/pending',
  authMiddleware, allowRoles('MANAGER'),
  supplierApprovalController.getPendingSupplierApprovals
);

// Manager: GET all history
router.get('/supplier-approvals/all',
  authMiddleware, allowRoles('MANAGER'),
  supplierApprovalController.getAllSupplierApprovals
);

// Procurement: GET my approvals
router.get('/supplier-approvals',
  authMiddleware, allowRoles('PROCUREMENT'),
  procurementController.getMySupplierApprovals
);

// Procurement: POST clarify (parameterized — comes after specific routes)
router.post('/supplier-approvals/:approval_id/clarify',
  authMiddleware, allowRoles('PROCUREMENT'),
  procurementController.giveClarification
);

// Manager: POST raise objection
router.post('/supplier-approvals/:approval_id/object',
  authMiddleware, allowRoles('MANAGER'),
  supplierApprovalController.raiseObjection
);

// Manager: POST approve
router.post('/supplier-approvals/:approval_id/approve',
  authMiddleware, allowRoles('MANAGER'),
  supplierApprovalController.approveSupplier
);

// Manager: POST reject
router.post('/supplier-approvals/:approval_id/reject',
  authMiddleware, allowRoles('MANAGER'),
  supplierApprovalController.rejectSupplier
);

module.exports = router;
