const {
  PurchaseRequest,
  RFQ,
  Quotation,
  PurchaseOrder,
  User
} = require('../db');

// ================= VIEW APPROVED PRs =================
exports.getApprovedRequests = async (req, res) => {
  try {
    const prs = await PurchaseRequest.findAll({
      where: { status: 'PENDING_PROCUREMENT' }
    });

    res.json(prs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= SEND RFQ =================
exports.sendRFQ = async (req, res) => {
  try {
    console.log('📦 req.body:', req.body); // DEBUG LOG
    
    //  SAFE: Handle undefined req.body
    const { pr_id, deadline } = req.body || {};
    
    //  VALIDATION
    if (!pr_id) {
      return res.status(400).json({ error: 'pr_id is required' });
    }
    if (!deadline) {
      return res.status(400).json({ error: 'deadline is required (YYYY-MM-DD)' });
    }

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) {
      return res.status(400).json({ error: 'Purchase Request not found' });
    }
    if (pr.status !== 'PENDING_PROCUREMENT') {
      return res.status(400).json({ error: `PR not ready for RFQ. Current status: ${pr.status}` });
    }

    const rfq = await RFQ.create({
      pr_id: parseInt(pr_id),
      deadline,
      status: 'OPEN'
    });

    pr.status = 'RFQ_SENT';
    await pr.save();

    res.json({ 
      message: 'RFQ sent successfully', 
      rfq: { rfq_id: rfq.rfq_id, pr_id: rfq.pr_id, deadline: rfq.deadline }
    });
    
  } catch (err) {
    console.error(' sendRFQ error:', err);
    res.status(500).json({ error: err.message });
  }
};


// ================= VIEW QUOTATIONS =================
exports.viewQuotations = async (req, res) => {
  try {
    const { rfq_id } = req.params;

    const quotes = await Quotation.findAll({
      where: { rfq_id },
      include: [User]
    });

    res.json(quotes);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= SELECT SUPPLIER =================
exports.selectSupplier = async (req, res) => {
  try {
    const { quotation_id } = req.params;

    const quotation = await Quotation.findByPk(quotation_id, {
      include: [RFQ]
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const pr = await PurchaseRequest.findByPk(quotation.RFQ.pr_id);

    const po = await PurchaseOrder.create({
      rfq_id: quotation.rfq_id,
      supplier_id: quotation.supplier_id,
      total_amount: quotation.price,
      status: 'ISSUED'
    });

    pr.status = 'SUPPLIER_SELECTED';
    await pr.save();

    res.json({ message: 'Supplier selected', purchaseOrder: po });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= MARK DELIVERED =================
exports.markDelivered = async (req, res) => {
  try {
    const { po_id } = req.params;

    const po = await PurchaseOrder.findByPk(po_id);
    if (!po) return res.status(404).json({ error: 'PO not found' });

    po.status = 'DELIVERED';
    await po.save();

    const rfq = await RFQ.findByPk(po.rfq_id);
    const pr = await PurchaseRequest.findByPk(rfq.pr_id);

    pr.status = 'DELIVERED';
    await pr.save();

    res.json({ message: 'Marked as delivered' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};