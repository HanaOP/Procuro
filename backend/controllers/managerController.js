const { PurchaseRequest } = require('../db');
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

module.exports = { pendingRequests, highPriority, rejectedList, clarify, approve, reject, approvedList, clarificationsList };

