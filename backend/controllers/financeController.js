const crypto = require('crypto');
const Razorpay = require('razorpay');
const { Op } = require('sequelize');
const { DepartmentBudget, PurchaseRequest, Invoice, PurchaseOrder, User, RFQ, Payment } = require('../db');
const { TransactionLog } = require('../db');
const { logTransaction } = require('../utils/transactionLogger');

let razorpayClient = null;

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  return razorpayClient;
}

async function addBudget(req, res) {
  try {
    if (req.user.role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers can add budget' });
    const { department, total_allocated, financial_year } = req.body;
    if (!department || !total_allocated || !financial_year) return res.status(400).json({ error: 'All fields are required' });

    const existing = await DepartmentBudget.findOne({ where: { department, financial_year } });
    if (existing) return res.status(400).json({ error: 'Budget already exists for this department for this financial year' });

    const newBudget = await DepartmentBudget.create({ department, total_allocated: parseFloat(total_allocated), used_amount: 0, remaining_amount: parseFloat(total_allocated), financial_year });
    res.status(201).json({ message: 'Budget added successfully', budget: newBudget });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function pendingRequests(req, res) {
  try {
    if (req.user.role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers can view this' });
    const requests = await PurchaseRequest.findAll({ where: { status: 'PENDING_FINANCE' }, order: [['created_at', 'DESC']] });
    res.json(requests);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function approveRequest(req, res) {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;
    if (role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers can approve' });

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) return res.status(404).json({ error: 'Request not found' });
    if (pr.status !== 'PENDING_FINANCE') return res.status(400).json({ error: 'Not pending finance approval' });

    const { Op } = require('sequelize');

const budget = await DepartmentBudget.findOne({where: {department: { [Op.iLike]: pr.department } // case-insensitive match
  }
});
    if (!budget) return res.status(404).json({ error: 'Department budget not found' });
    if (parseFloat(budget.remaining_amount) < parseFloat(pr.total_amount)) return res.status(400).json({ error: 'Insufficient budget' });

    budget.used_amount = parseFloat(budget.used_amount) + parseFloat(pr.total_amount);
    budget.remaining_amount = parseFloat(budget.total_allocated) - parseFloat(budget.used_amount);
    await budget.save();

    pr.status = 'PENDING_PROCUREMENT';
    await pr.save();
    res.json({ message: 'Finance approved. Sent to procurement.', request: pr });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function rejectRequest(req, res) {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;
    if (role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers can reject' });

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) return res.status(404).json({ error: 'Request not found' });

    pr.status = 'REJECTED';
    pr.manager_comment = 'Rejected by finance';
    await pr.save();
    res.json({ message: 'Request rejected by finance' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
}

async function getInvoices(req, res) {
  try {
    if (req.user.role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers allowed' });

    const invoices = await Invoice.findAll({
      include: [
        { 
          model: PurchaseOrder,
          include: [{
            model: RFQ,
            include: [{ model: PurchaseRequest }]
          }]
        },
        { model: User, as: 'Supplier', attributes: ['user_id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function updateInvoiceStatus(req, res) {
  try {
    if (req.user.role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers allowed' });

    const { id } = req.params;
    const { status } = req.body;

    if (!['PAID', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const invoice = await Invoice.findByPk(id, {
      include: [{
        model: PurchaseOrder,
        include: [{
          model: RFQ,
          include: [{ model: PurchaseRequest }]
        }]
      }]
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    invoice.status = status;
    await invoice.save();

    await logTransaction('INVOICE_VALIDATED', req.user, status === 'REJECTED' ? 'Rejected' : 'Approved', {
      requestId: invoice.po_id,
      invoiceId: invoice.invoice_id,
      amount: invoice.amount,
      remarks: status === 'REJECTED'
        ? 'Invoice rejected during finance validation'
        : 'Invoice approved during finance validation',
    });

    // If REJECTED, move PR back to PENDING_PROCUREMENT
    if (status === 'REJECTED') {
      const pr = invoice.PurchaseOrder?.RFQ?.PurchaseRequest;
      if (pr) {
        pr.status = 'PENDING_PROCUREMENT';
        await pr.save();
      }
    }

    res.json({ message: `Invoice status updated to ${status}. Purchase Request has been re-opened for procurement.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function createInvoicePaymentOrder(req, res) {
  try {
    if (req.user.role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers allowed' });

    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: User, as: 'Supplier', attributes: ['name', 'email'] }]
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status !== 'PENDING') {
      return res.status(400).json({ error: `Payment can only be initiated for PENDING invoices. Current status: ${invoice.status}` });
    }

    const client = getRazorpayClient();
    if (!client) {
      return res.status(500).json({ error: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' });
    }

    const amountInPaise = Math.round(parseFloat(invoice.amount) * 100);
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      return res.status(400).json({ error: 'Invalid invoice amount for payment' });
    }

    const order = await client.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `inv_${invoice.invoice_id}_${Date.now()}`.slice(0, 40),
      notes: {
        invoice_id: String(invoice.invoice_id),
        invoice_number: String(invoice.invoice_number),
      }
    });

    await logTransaction('INVOICE_VALIDATED', req.user, 'Approved', {
      requestId: invoice.po_id,
      invoiceId: invoice.invoice_id,
      amount: invoice.amount,
      remarks: 'Invoice approved and ready for payment',
    });

    await logTransaction('PAYMENT_INITIATED', req.user, 'Payment Initiated', {
      requestId: invoice.po_id,
      invoiceId: invoice.invoice_id,
      amount: invoice.amount,
      paymentId: order.id,
      remarks: `Razorpay order created (${order.id})`,
    });

    return res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      invoice: {
        invoice_id: invoice.invoice_id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        supplier_name: invoice.supplier_name || invoice.Supplier?.name || '',
        supplier_email: invoice.Supplier?.email || '',
      }
    });
  } catch (err) {
    console.error('createInvoicePaymentOrder error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function verifyInvoicePayment(req, res) {
  try {
    if (req.user.role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers allowed' });

    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing Razorpay payment verification fields' });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay secret is not configured' });
    }

    const invoice = await Invoice.findByPk(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'PAID') {
      return res.json({ message: 'Invoice already marked as PAID', invoice });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await logTransaction('PAYMENT_VERIFICATION', req.user, 'Failed', {
        requestId: invoice.po_id,
        invoiceId: invoice.invoice_id,
        paymentId: razorpay_payment_id,
        amount: invoice.amount,
        remarks: 'Razorpay signature verification failed',
      });
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    invoice.status = 'PAID';
    await invoice.save();

    await Payment.create({
      invoice_id: invoice.invoice_id,
      payment_method: 'RAZORPAY',
    });

    await logTransaction('PAYMENT_SUCCESS', req.user, 'Paid', {
      requestId: invoice.po_id,
      invoiceId: invoice.invoice_id,
      paymentId: razorpay_payment_id,
      amount: invoice.amount,
      remarks: 'Razorpay payment captured successfully',
    });

    await logTransaction('WORKFLOW_COMPLETED', req.user, 'Completed', {
      requestId: invoice.po_id,
      invoiceId: invoice.invoice_id,
      paymentId: razorpay_payment_id,
      amount: invoice.amount,
      remarks: 'Procurement workflow completed after successful payment',
    });

    return res.json({ message: 'Payment verified and invoice marked as PAID', invoice });
  } catch (err) {
    console.error('verifyInvoicePayment error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function logInvoicePaymentFailure(req, res) {
  try {
    if (req.user.role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers allowed' });

    const { id } = req.params;
    const { razorpay_payment_id, razorpay_order_id, error_description } = req.body;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await logTransaction('PAYMENT_FAILED', req.user, 'Failed', {
      requestId: invoice.po_id,
      invoiceId: invoice.invoice_id,
      paymentId: razorpay_payment_id || razorpay_order_id || null,
      amount: invoice.amount,
      remarks: error_description || 'Payment failed or checkout aborted',
    });

    return res.json({ message: 'Payment failure logged' });
  } catch (err) {
    console.error('logInvoicePaymentFailure error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getInvoiceTransactions(req, res) {
  try {
    if (req.user.role !== 'FINANCE') return res.status(403).json({ error: 'Only finance officers allowed' });

    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const logs = await TransactionLog.findAll({
      where: {
        [Op.or]: [
          { invoice_id: id },
          { request_id: invoice.po_id },
        ]
      },
      order: [['timestamp', 'ASC'], ['transaction_id', 'ASC']],
    });

    res.json(logs);
  } catch (err) {
    console.error('getInvoiceTransactions error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  addBudget,
  pendingRequests,
  approveRequest,
  rejectRequest,
  getInvoices,
  updateInvoiceStatus,
  createInvoicePaymentOrder,
  verifyInvoicePayment,
  logInvoicePaymentFailure,
  getInvoiceTransactions,
};
