const { Exception, PurchaseRequest } = require('../db');

async function raiseException(req, res) {
  try {
    const { user_id, role } = req.user;
    const pr_id = req.params.id;
    if (role !== 'EMPLOYEE') return res.status(403).json({ error: 'Only employees can raise exceptions' });

    const pr = await PurchaseRequest.findOne({ where: { pr_id, employee_id: user_id } });
    if (!pr) return res.status(404).json({ error: 'Request not found' });

    const { exception_type, urgency_level, reason } = req.body;
    if (!exception_type || !urgency_level || !reason) return res.status(400).json({ error: 'exception_type, urgency_level and reason are required' });

    const allowedUrgency = ['LOW', 'MEDIUM', 'HIGH'];
    if (!allowedUrgency.includes(urgency_level)) return res.status(400).json({ error: 'urgency_level must be LOW, MEDIUM, or HIGH' });

    const exc = await Exception.create({ pr_id, employee_id: user_id, exception_type, urgency_level, reason, document_path: null });
    return res.status(201).json({ message: 'Exception raised', exception: exc });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

async function viewExceptions(req, res) {
  try {
    const { role } = req.user;
    if (role !== 'MANAGER') return res.status(403).json({ error: 'Only managers can view this' });

    const exceptions = await Exception.findAll({ include: [PurchaseRequest], order: [['created_at', 'DESC']] });
    return res.json(exceptions);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }
}

module.exports = { raiseException, viewExceptions };
