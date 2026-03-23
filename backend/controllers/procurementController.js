const {
  PurchaseRequest,
  RFQ,
  Quotation,
  PurchaseOrder,
  Invoice,
  User,
  SupplierApprovalRequest,
} = require('../db');
const { Op } = require('sequelize');

// ================= VIEW ALL PROCUREMENT RELEVANT REQUESTS =================
exports.getApprovedRequests = async (req, res) => {
  try {
    const prs = await PurchaseRequest.findAll({
      where: {
        status: [
          'PENDING_PROCUREMENT',
          'RFQ_SENT',
          'SUPPLIER_SELECTED',
          'ORDER_PLACED',
          'DELIVERED',
          'COMPLETED'
        ]
      },
      include: [RFQ],
      order: [['created_at', 'DESC']]
    });

    // Flatten for frontend convenience (ensure rfq_id is top-level if RFQ exists)
    const flattened = prs.map(pr => {
      const plain = pr.get({ plain: true });
      if (plain.RFQ) {
        plain.rfq_id = plain.RFQ.rfq_id;
      }
      return plain;
    });

    res.json(flattened);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= SEND RFQ =================
exports.sendRFQ = async (req, res) => {
  try {
    const { pr_id, deadline } = req.body || {};
    if (!pr_id)    return res.status(400).json({ error: 'pr_id is required' });
    if (!deadline) return res.status(400).json({ error: 'deadline is required (YYYY-MM-DD)' });

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) return res.status(400).json({ error: 'Purchase Request not found' });
    if (pr.status !== 'PENDING_PROCUREMENT') {
      return res.status(400).json({ error: `PR not ready for RFQ. Current status: ${pr.status}` });
    }

    const rfq = await RFQ.create({ pr_id: parseInt(pr_id), deadline, status: 'OPEN' });
    pr.status = 'RFQ_SENT';
    await pr.save();

    res.json({ message: 'RFQ sent successfully', rfq: { rfq_id: rfq.rfq_id, pr_id: rfq.pr_id, deadline: rfq.deadline } });
  } catch (err) {
    console.error('sendRFQ error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ================= VIEW QUOTATIONS =================
exports.viewQuotations = async (req, res) => {
  try {
    const { rfq_id } = req.params;
    const quotes = await Quotation.findAll({ where: { rfq_id }, include: [User] });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= SELECT SUPPLIER → sends to manager for review =================
exports.selectSupplier = async (req, res) => {
  try {
    const { quotation_id } = req.params;
    const procurement_user_id = req.user.user_id;

    const quotation = await Quotation.findByPk(quotation_id, { include: [RFQ] });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const pr = await PurchaseRequest.findByPk(quotation.RFQ.pr_id);
    if (!pr) return res.status(404).json({ error: 'Purchase Request not found' });

    // Check if already pending manager review
    const existing = await SupplierApprovalRequest.findOne({
      where: { pr_id: pr.pr_id, status: 'PENDING_MANAGER_REVIEW' }
    });
    if (existing) {
      return res.status(400).json({ error: 'This PR already has a pending supplier approval request' });
    }

    // 5 minutes for demo (change to 2 * 24 * 60 * 60 * 1000 for production)
    const REVIEW_WINDOW_MS = 5 * 60 * 1000;
    const review_deadline  = new Date(Date.now() + REVIEW_WINDOW_MS);

    const approval = await SupplierApprovalRequest.create({
      quotation_id,
      pr_id:               pr.pr_id,
      supplier_id:         quotation.supplier_id,
      procurement_user_id,
      status:              'PENDING_MANAGER_REVIEW',
      review_deadline,
    });

    pr.status = 'SUPPLIER_SELECTED';
    await pr.save();

    res.json({
      message: 'Supplier selection sent to manager for review. Manager has 2 minutes to raise an objection.',
      approval_id:    approval.approval_id,
      review_deadline,
    });
  } catch (err) {
    console.error('selectSupplier error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ================= GET MY SUPPLIER APPROVALS (procurement sees their selections) =================
exports.getMySupplierApprovals = async (req, res) => {
  try {
    const approvals = await SupplierApprovalRequest.findAll({
      where: { procurement_user_id: req.user.user_id },
      include: [
        { model: PurchaseRequest },
        { model: Quotation },
        { model: User, as: 'Supplier', attributes: ['user_id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= GIVE CLARIFICATION (procurement responds to manager objection) =================
exports.giveClarification = async (req, res) => {
  try {
    const { approval_id } = req.params;
    const { clarification } = req.body;

    if (!clarification) return res.status(400).json({ error: 'Clarification message is required' });

    const approval = await SupplierApprovalRequest.findByPk(approval_id);
    if (!approval) return res.status(404).json({ error: 'Approval request not found' });

    if (approval.procurement_user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'You can only clarify your own supplier selections' });
    }
    if (approval.status !== 'MANAGER_OBJECTED') {
      return res.status(400).json({ error: 'No objection raised to clarify' });
    }

    approval.procurement_clarification = clarification;
    approval.status = 'CLARIFICATION_GIVEN';
    await approval.save();

    res.json({ message: 'Clarification submitted to manager', approval });
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
    const pr  = await PurchaseRequest.findByPk(rfq.pr_id);
    pr.status = 'DELIVERED';
    await pr.save();

    res.json({ message: 'Marked as delivered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= PROCUREMENT SUPPLIER CLASSIFICATIONS =================
exports.getSupplierClassifications = async (req, res) => {
  try {
    const procurementUserId = req.user.user_id;

    // 1) Quotation uploaded only: RFQ is active and has quotations, but supplier not yet selected.
    const quotationOnlyRequests = await PurchaseRequest.findAll({
      where: { status: 'RFQ_SENT' },
      include: [{
        model: RFQ,
        include: [{
          model: Quotation,
          required: true,
          include: [{ model: User, attributes: ['user_id', 'name', 'email'] }],
        }],
      }],
      order: [['created_at', 'DESC']],
    });

    const quotationUploadedOnly = quotationOnlyRequests.map((pr) => {
      const plain = pr.get({ plain: true });
      const quotations = plain.RFQ?.Quotations || [];
      return {
        pr_id: plain.pr_id,
        item_name: plain.item_name,
        department: plain.department,
        rfq_id: plain.RFQ?.rfq_id || null,
        quote_count: quotations.length,
        suppliers: quotations.map((q) => ({
          quotation_id: q.quotation_id,
          supplier_id: q.supplier_id,
          supplier_name: q.User?.name || null,
          price: q.price,
          submitted_at: q.submitted_at,
        })),
      };
    });

    // 2) Selected as supplier: selected by procurement but still under manager review cycle.
    const selectedAsSupplier = await SupplierApprovalRequest.findAll({
      where: {
        procurement_user_id: procurementUserId,
        status: { [Op.in]: ['PENDING_MANAGER_REVIEW', 'MANAGER_OBJECTED', 'CLARIFICATION_GIVEN'] },
      },
      include: [
        { model: PurchaseRequest, attributes: ['pr_id', 'item_name', 'department', 'status'] },
        { model: Quotation, attributes: ['quotation_id', 'price', 'submitted_at'] },
        { model: User, as: 'Supplier', attributes: ['user_id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });

    // 3 & 4) Approved selections split by invoice submission status.
    const approvedSelections = await SupplierApprovalRequest.findAll({
      where: {
        procurement_user_id: procurementUserId,
        status: 'APPROVED',
      },
      include: [
        { model: PurchaseRequest, attributes: ['pr_id', 'item_name', 'department', 'status'] },
        { model: Quotation, include: [{ model: RFQ, attributes: ['rfq_id'] }], attributes: ['quotation_id', 'price'] },
        { model: User, as: 'Supplier', attributes: ['user_id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const invoiceSubmitted = [];
    const invoiceNotSubmitted = [];

    for (const approval of approvedSelections) {
      const plain = approval.get({ plain: true });
      const rfqId = plain.Quotation?.RFQ?.rfq_id;

      const po = rfqId
        ? await PurchaseOrder.findOne({
            where: { rfq_id: rfqId, supplier_id: plain.supplier_id },
            include: [{ model: Invoice }],
            order: [['po_id', 'DESC']],
          })
        : null;

      const poPlain = po ? po.get({ plain: true }) : null;
      const invoices = poPlain?.Invoices || [];

      const record = {
        approval_id: plain.approval_id,
        pr_id: plain.pr_id,
        item_name: plain.PurchaseRequest?.item_name || null,
        department: plain.PurchaseRequest?.department || null,
        supplier_id: plain.supplier_id,
        supplier_name: plain.Supplier?.name || null,
        quotation_id: plain.quotation_id,
        quoted_price: plain.Quotation?.price || null,
        po_id: poPlain?.po_id || null,
        po_status: poPlain?.status || null,
        invoice_count: invoices.length,
        invoices: invoices.map((inv) => ({
          invoice_id: inv.invoice_id,
          invoice_number: inv.invoice_number,
          amount: inv.amount,
          status: inv.status,
          createdAt: inv.createdAt,
        })),
      };

      if (invoices.length > 0) {
        invoiceSubmitted.push(record);
      } else {
        invoiceNotSubmitted.push(record);
      }
    }

    return res.json({
      counts: {
        quotationUploadedOnly: quotationUploadedOnly.length,
        selectedAsSupplier: selectedAsSupplier.length,
        invoiceSubmitted: invoiceSubmitted.length,
        invoiceNotSubmitted: invoiceNotSubmitted.length,
      },
      quotationUploadedOnly,
      selectedAsSupplier: selectedAsSupplier.map((a) => a.get({ plain: true })),
      invoiceSubmitted,
      invoiceNotSubmitted,
    });
  } catch (err) {
    console.error('getSupplierClassifications error:', err);
    res.status(500).json({ error: err.message });
  }
};