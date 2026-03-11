//View Open RFQs
const { RFQ, PurchaseRequest } = require('../db');

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

//Submit Quotation
const { Quotation } = require('../db');

exports.submitQuotation = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const { rfq_id, price, delivery_time_days, contract_document } = req.body;

    if (!rfq_id || !price)
      return res.status(400).json({ error: 'rfq_id and price required' });

    const rfq = await RFQ.findByPk(rfq_id);

    if (!rfq || rfq.status !== 'OPEN')
      return res.status(400).json({ error: 'Invalid or closed RFQ' });

    const quotation = await Quotation.create({
      rfq_id,
      supplier_id: req.user.user_id,
      price,
      delivery_time_days,
      contract_document: contract_document || null,
      status: 'SUBMITTED'
    });

    res.status(201).json({
      message: 'Quotation submitted successfully',
      quotation
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//View Own Quotations
exports.myQuotations = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const quotations = await Quotation.findAll({
      where: { supplier_id: req.user.user_id }
    });

    res.json(quotations);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};