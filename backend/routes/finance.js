const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleMiddleware');
const finance = require('../controllers/financeController');

router.post('/budget',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.addBudget
);

router.get('/requests/pending',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.pendingRequests
);

router.post('/requests/:id/approve',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.approveRequest
);

router.post('/requests/:id/reject',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.rejectRequest
);

router.get('/invoices',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.getInvoices
);

router.post('/invoices/:id/status',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.updateInvoiceStatus
);

router.post('/invoices/:id/payment-order',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.createInvoicePaymentOrder
);

router.post('/invoices/:id/verify-payment',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.verifyInvoicePayment
);

router.post('/invoices/:id/payment-failed',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.logInvoicePaymentFailure
);

router.get('/invoices/:id/transactions',
  authMiddleware,
  allowRoles('FINANCE'),
  finance.getInvoiceTransactions
);

module.exports = router;