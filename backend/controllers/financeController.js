const { DepartmentBudget, PurchaseRequest, Invoice, PurchaseOrder, User, RFQ } = require('../db');

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

module.exports = { addBudget, pendingRequests, approveRequest, rejectRequest, getInvoices, updateInvoiceStatus };
