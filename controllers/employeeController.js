const { PurchaseRequest } = require('../db');

async function createRequest(req, res) {
  try {
    const { user_id, role } = req.user;
    const isDraft = req.query.draft === 'true';
    if (role !== 'EMPLOYEE') return res.status(403).json({ error: 'Only employees can create requests' });

    const { item_name, item_details, quantity, estimated_unit_price, category, required_by, delivery_location, priority, department } = req.body;
    if (!item_name || (!quantity && quantity !== 0) || (!estimated_unit_price && estimated_unit_price !== 0) || !category || !required_by || !delivery_location || !priority || !department) {
      return res.status(400).json({ error: 'Please fill all required fields' });
    }

    if (typeof quantity !== 'number' || quantity < 1 || quantity > 100) return res.status(400).json({ error: 'Quantity must be a number between 1 and 100' });
    if (typeof estimated_unit_price !== 'number' || estimated_unit_price <= 0) return res.status(400).json({ error: 'Estimated unit price must be a positive number' });

    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (!allowedPriorities.includes(priority)) return res.status(400).json({ error: 'Priority must be LOW, MEDIUM, or HIGH' });

    const today = new Date(); today.setHours(0,0,0,0);
    const reqDate = new Date(required_by);
    if (isNaN(reqDate.getTime())) return res.status(400).json({ error: 'required_by must be a valid date (YYYY-MM-DD)' });
    reqDate.setHours(0,0,0,0);
    if (reqDate < today) return res.status(400).json({ error: 'required_by date cannot be in the past' });

    const total_amount = quantity * estimated_unit_price;
    const pr = await PurchaseRequest.create({ employee_id: user_id, department, item_name, item_details: item_details || '', quantity, estimated_unit_price, category, required_by: reqDate, delivery_location, priority, total_amount, is_draft: isDraft, status: 'PENDING_MANAGER' });

    return res.status(201).json({ message: 'Purchase request submitted', request: pr });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getRequests(req, res) {
  try {
    const { user_id, role } = req.user;
    if (role !== 'EMPLOYEE') return res.status(403).json({ error: 'Only employees can view this' });

    const requests = await PurchaseRequest.findAll({ where: { employee_id: user_id }, order: [['created_at', 'DESC']] });
    return res.json(requests);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getDrafts(req, res) {
  try {
    const { user_id, role } = req.user;
    if (role !== 'EMPLOYEE') return res.status(403).json({ error: 'Only employees can view this' });

    const drafts = await PurchaseRequest.findAll({ where: { employee_id: user_id, is_draft: true }, order: [['created_at', 'DESC']] });
    return res.json(drafts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getRejected(req, res) {
  try {
    const { user_id, role } = req.user;
    if (role !== 'EMPLOYEE') return res.status(403).json({ error: 'Only employees can view this' });

    const rejected = await PurchaseRequest.findAll({ where: { employee_id: user_id, status: 'REJECTED' }, order: [['created_at', 'DESC']] });
    return res.json(rejected);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateDraft(req, res) {
  try {
    const { user_id, role } = req.user;
    const pr_id = req.params.id;
    if (role !== 'EMPLOYEE') return res.status(403).json({ error: 'Only employees can edit requests' });

    const pr = await PurchaseRequest.findOne({ where: { pr_id, employee_id: user_id } });
    if (!pr) return res.status(404).json({ error: 'Request not found' });
    if (!pr.is_draft) return res.status(400).json({ error: 'Only draft requests can be edited' });

    const { item_name, item_details, quantity, estimated_unit_price, category, required_by, delivery_location, priority, department } = req.body;
    if (item_name !== undefined) pr.item_name = item_name;
    if (item_details !== undefined) pr.item_details = item_details;
    if (quantity !== undefined) pr.quantity = quantity;
    if (estimated_unit_price !== undefined) pr.estimated_unit_price = estimated_unit_price;
    if (category !== undefined) pr.category = category;
    if (required_by !== undefined) pr.required_by = required_by;
    if (delivery_location !== undefined) pr.delivery_location = delivery_location;
    if (priority !== undefined) pr.priority = priority;
    if (department !== undefined) pr.department = department;

    if (pr.quantity && pr.estimated_unit_price) pr.total_amount = pr.quantity * pr.estimated_unit_price;
    await pr.save();

    return res.json({ message: 'Draft purchase request updated', request: pr });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createRequest, getRequests, getDrafts, getRejected, updateDraft };
