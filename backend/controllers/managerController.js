const { PurchaseRequest, TransactionLog, Invoice, PurchaseOrder } = require('../db');
const { Op } = require('sequelize');

async function pendingRequests(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can view this' });

    const pending = await PurchaseRequest.findAll({ where: { status: 'PENDING_MANAGER' }, order: [['created_at', 'DESC']] });
    return res.json(pending);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

async function highPriority(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can view this' });

    const high = await PurchaseRequest.findAll({ where: { status: 'PENDING_MANAGER', priority: 'HIGH' }, order: [['created_at', 'DESC']] });
    return res.json(high);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

async function rejectedList(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can view this' });

    const rejected = await PurchaseRequest.findAll({ where: { status: 'REJECTED' }, order: [['created_at', 'DESC']] });
    return res.json(rejected);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

async function clarify(req, res) {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;
    const { message } = req.body;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can request clarification' });
    if (!message) return res.status(400).json({ error: 'Clarification message is required' });

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) return res.status(404).json({ error: 'Request not found' });
    if (pr.status !== 'PENDING_MANAGER') return res.status(400).json({ error: 'Only pending manager requests can be sent for clarification' });

    pr.clarification_message = message;
    await pr.save();
    return res.json({ message: 'Clarification message saved for employee', request: pr });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

async function approve(req, res) {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can approve requests' });

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) return res.status(404).json({ error: 'Request not found' });
    if (pr.status !== 'PENDING_MANAGER' && !pr.clarification_reply)
      return res.status(400).json({ error: 'Request is not pending manager approval' });

    pr.clarification_message = null;
    pr.clarification_reply = null;
    pr.status = 'PENDING_FINANCE';
    await pr.save();
    return res.json({ message: 'Request approved by manager', request: pr });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

async function reject(req, res) {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;
    const { manager_comment } = req.body;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can reject requests' });

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) return res.status(404).json({ error: 'Request not found' });
    if (pr.status !== 'PENDING_MANAGER' && !pr.clarification_reply)
      return res.status(400).json({ error: 'Request is not pending manager approval' });

    const comment = (manager_comment || req.body.reason || '').trim();
    if (!comment) {
      return res.status(400).json({ error: 'A rejection reason is required' });
    }
    pr.status = 'REJECTED';
    pr.manager_comment = comment;
    await pr.save();
    return res.json({ message: 'Request rejected by manager', request: pr });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}



async function approvedList(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can view this' });

    const approved = await PurchaseRequest.findAll({ where: { status: 'PENDING_FINANCE' }, order: [['created_at', 'DESC']] });
    return res.json(approved);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

async function clarificationsList(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can view this' });

    const list = await PurchaseRequest.findAll({
      where: { clarification_message: { [Op.not]: null } },
      order: [['created_at', 'DESC']]
    });
    return res.json(list);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

async function completedAuditTrails(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can view this' });

    const completedRows = await TransactionLog.findAll({
      where: { status: 'Completed', request_id: { [Op.not]: null } },
      attributes: ['request_id'],
      group: ['request_id'],
      raw: true,
    });

    const requestIds = completedRows
      .map((row) => row.request_id)
      .filter((id) => Number.isInteger(id));

    if (requestIds.length === 0) {
      return res.json([]);
    }

    const logs = await TransactionLog.findAll({
      where: { request_id: { [Op.in]: requestIds } },
      include: [
        {
          model: Invoice,
          attributes: ['invoice_id', 'invoice_number', 'amount', 'status'],
          required: false,
        },
        {
          model: PurchaseOrder,
          attributes: ['po_id', 'status', 'total_amount'],
          required: false,
        },
      ],
      order: [['request_id', 'DESC'], ['timestamp', 'ASC'], ['transaction_id', 'ASC']],
    });

    const grouped = logs.reduce((acc, row) => {
      const log = row.get({ plain: true });
      const requestId = log.request_id;

      if (!acc[requestId]) {
        acc[requestId] = {
          requestId,
          purchaseOrder: log.PurchaseOrder || null,
          latestInvoice: log.Invoice || null,
          completedAt: null,
          amount: log.amount || null,
          paymentId: null,
          logs: [],
        };
      }

      if (log.status === 'Completed') {
        acc[requestId].completedAt = log.timestamp;
      }

      if (log.payment_id) {
        acc[requestId].paymentId = log.payment_id;
      }

      if (log.amount != null) {
        acc[requestId].amount = log.amount;
      }

      if (log.Invoice) {
        acc[requestId].latestInvoice = log.Invoice;
      }

      acc[requestId].logs.push({
        transactionId: log.transaction_id,
        action: log.action,
        status: log.status,
        amount: log.amount,
        paymentId: log.payment_id,
        performedBy: log.performed_by,
        remarks: log.remarks,
        timestamp: log.timestamp,
      });

      return acc;
    }, {});

    const result = Object.values(grouped).sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { pendingRequests, highPriority, rejectedList, clarify, approve, reject, approvedList, clarificationsList, completedAuditTrails };

