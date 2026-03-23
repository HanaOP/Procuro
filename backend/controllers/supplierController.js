const { RFQ, PurchaseRequest, Quotation, SupplierApprovalRequest } = require('../db');
const path = require('path');
const fs   = require('fs');

// ================= VIEW OPEN RFQs =================
exports.viewOpenRFQs = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const rfqs = await RFQ.findAll({
      where: { status: 'OPEN' },
      include: [PurchaseRequest]
    });
    res.json(rfqs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= SUBMIT QUOTATION =================
exports.submitQuotation = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const { rfq_id, price, delivery_time, terms } = req.body;

    if (!rfq_id || !price)
      return res.status(400).json({ error: 'rfq_id and price are required' });

    const rfq = await RFQ.findByPk(rfq_id);
    if (!rfq || rfq.status !== 'OPEN')
      return res.status(400).json({ error: 'Invalid or closed RFQ' });

    // Handle uploaded PDF file if present
    let contract_document = null;
    if (req.file) {
      contract_document = req.file.filename;
    }

    const quotation = await Quotation.create({
      rfq_id,
      supplier_id:       req.user.user_id,
      price:             parseFloat(price),
      delivery_time:     delivery_time || null,
      terms:             terms || null,
      contract_document: contract_document || null,
    });

    res.status(201).json({ message: 'Quotation submitted successfully', quotation });
  } catch (err) {
    console.error('submitQuotation error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ================= VIEW OWN QUOTATIONS =================
exports.myQuotations = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const quotations = await Quotation.findAll({
      where: { supplier_id: req.user.user_id },
      include: [{ model: RFQ, include: [PurchaseRequest] }]
    });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= MY SELECTION STATUS =================
exports.getMySelectionStatus = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const approvals = await SupplierApprovalRequest.findAll({
      where: { supplier_id: req.user.user_id },
      include: [
        { model: PurchaseRequest },
        { model: Quotation },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};