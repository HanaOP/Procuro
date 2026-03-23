const { RFQ, PurchaseRequest, Quotation, SupplierApprovalRequest, PurchaseOrder, Invoice } = require('../db');
const { Op } = require('sequelize');
const path = require('path');
const fs   = require('fs');
const { logTransaction } = require('../utils/transactionLogger');

function getLocalDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ================= VIEW OPEN RFQs =================
exports.viewOpenRFQs = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const rfqs = await RFQ.findAll({
      where: { status: 'OPEN' },
      include: [{
        model: PurchaseRequest,
        where: { status: { [Op.notIn]: ['ORDER_PLACED', 'DELIVERED', 'COMPLETED'] } }
      }]
    });

    const enriched = await Promise.all(rfqs.map(async (rfq) => {
      const quoteCount = await Quotation.count({
        where: {
          rfq_id: rfq.rfq_id,
          supplier_id: req.user.user_id,
        }
      });

      return {
        ...rfq.get({ plain: true }),
        my_quotation_count: quoteCount,
        max_quotations: 3,
        remaining_quotations: Math.max(0, 3 - quoteCount),
        quotation_limit_reached: quoteCount >= 3,
      };
    }));

    res.json(enriched);
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

    const rfq = await RFQ.findByPk(rfq_id, { include: [PurchaseRequest] });
    if (!rfq || rfq.status !== 'OPEN')
      return res.status(400).json({ error: 'Invalid or closed RFQ' });

    const requestStatus = rfq.PurchaseRequest?.status;
    if (['ORDER_PLACED', 'DELIVERED', 'COMPLETED'].includes(requestStatus)) {
      return res.status(400).json({
        error: 'Quotation submission is closed because order has already been placed for this request'
      });
    }

    const existingPO = await PurchaseOrder.findOne({ where: { rfq_id } });
    if (existingPO) {
      return res.status(400).json({
        error: 'Quotation submission is closed because order has already been placed for this RFQ'
      });
    }

    const quoteCount = await Quotation.count({
      where: {
        rfq_id,
        supplier_id: req.user.user_id,
      }
    });

    if (quoteCount >= 3) {
      return res.status(400).json({
        error: 'You have reached the maximum limit of 3 quotations for this request'
      });
    }

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

    res.status(201).json({
      message: 'Quotation submitted successfully',
      quotation,
      quotation_count: quoteCount + 1,
      remaining_quotations: Math.max(0, 3 - (quoteCount + 1)),
    });
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

// ================= GET MY ORDERS =================
exports.getMyOrders = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const orders = await PurchaseOrder.findAll({
      where: { supplier_id: req.user.user_id },
      include: [
        { model: RFQ, include: [PurchaseRequest] },
        { model: Invoice },
      ],
      order: [['issued_date', 'DESC']],
    });

    const enriched = orders.map((order) => {
      const plain = order.get({ plain: true });
      const invoices = Array.isArray(plain.Invoices) ? [...plain.Invoices] : [];
      invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return {
        ...plain,
        latest_invoice: invoices[0] || null,
        invoice_uploaded: invoices.length > 0,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= UPLOAD INVOICE =================
exports.uploadInvoice = async (req, res) => {
  try {
    if (req.user.role !== 'SUPPLIER')
      return res.status(403).json({ error: 'Only suppliers allowed' });

    const {
      po_id,
      invoice_number,
      invoice_date,
      due_date,
      supplier_name,
      company_name,
      gstin,
      delivered_quantity,
      unit_price,
      subtotal,
      tax_percent,
      total_invoice_amount,
      payment_terms,
      payment_method,
      remarks,
    } = req.body;

    if (!po_id || !invoice_number || !invoice_date || !unit_price || !total_invoice_amount) {
      return res.status(400).json({
        error: 'po_id, invoice_number, invoice_date, unit_price, and total_invoice_amount are required'
      });
    }

    const invoiceDateStr = String(invoice_date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDateStr)) {
      return res.status(400).json({ error: 'Invalid invoice date' });
    }

    const todayStr = getLocalDateString();

    // Compare YYYY-MM-DD strings to avoid timezone shifts from Date parsing.
    if (invoiceDateStr < todayStr) {
      return res.status(400).json({ error: 'Invoice date cannot be in the past' });
    }

    const unitPriceNum = parseFloat(unit_price);
    const totalAmountNum = parseFloat(total_invoice_amount);
    const subtotalNum = subtotal ? parseFloat(subtotal) : NaN;
    const taxNum = tax_percent ? parseFloat(tax_percent) : 0;

    if (!Number.isFinite(unitPriceNum) || unitPriceNum <= 0) {
      return res.status(400).json({ error: 'Unit price must be a positive number' });
    }

    if (!Number.isFinite(totalAmountNum) || totalAmountNum <= 0) {
      return res.status(400).json({ error: 'Total invoice amount must be a positive number' });
    }

    const deliveredQtyNum = parseInt(delivered_quantity, 10);
    if (!Number.isInteger(deliveredQtyNum) || deliveredQtyNum <= 0) {
      return res.status(400).json({ error: 'Delivered quantity must be a positive whole number' });
    }

    if (tax_percent && (!Number.isFinite(taxNum) || taxNum < 0 || taxNum > 100)) {
      return res.status(400).json({ error: 'Tax (%) must be between 0 and 100' });
    }

    const po = await PurchaseOrder.findByPk(po_id, {
      include: [{ model: RFQ, include: [PurchaseRequest] }]
    });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });
    if (po.supplier_id !== req.user.user_id) {
      return res.status(403).json({ error: 'You can only upload invoices for your own orders' });
    }

    const existingInvoice = await Invoice.findOne({
      where: {
        po_id,
        supplier_id: req.user.user_id,
      },
      order: [['createdAt', 'DESC']],
    });

    if (existingInvoice) {
      return res.status(400).json({
        error: 'Invoice already uploaded for this purchase order',
        invoice: {
          invoice_id: existingInvoice.invoice_id,
          invoice_number: existingInvoice.invoice_number,
          status: existingInvoice.status,
          createdAt: existingInvoice.createdAt,
        },
      });
    }

    const prQuantity = po.RFQ?.PurchaseRequest?.quantity;
    if (!prQuantity) {
      return res.status(400).json({ error: 'Original order quantity not found' });
    }

    if (deliveredQtyNum > prQuantity) {
      await logTransaction('INVOICE_VALIDATION', req.user, 'Flagged', {
        requestId: po.po_id,
        amount: totalAmountNum,
        remarks: `Delivered quantity (${deliveredQtyNum}) exceeded ordered quantity (${prQuantity})`,
      });
      return res.status(400).json({
        error: `Delivered quantity (${deliveredQtyNum}) cannot be greater than ordered quantity (${prQuantity})`
      });
    }

    const deliveryStatus = deliveredQtyNum === prQuantity ? 'FULL_MATCH' : 'PARTIAL_DELIVERY';

    const effectiveSubtotal = Number.isFinite(subtotalNum)
      ? subtotalNum
      : parseFloat((deliveredQtyNum * unitPriceNum).toFixed(2));

    const expectedSubtotal = parseFloat((deliveredQtyNum * unitPriceNum).toFixed(2));
    if (Math.abs(effectiveSubtotal - expectedSubtotal) > 1) {
      await logTransaction('INVOICE_VALIDATION', req.user, 'Flagged', {
        requestId: po.po_id,
        amount: totalAmountNum,
        remarks: `Subtotal mismatch. Expected approx ${expectedSubtotal.toFixed(2)}, got ${effectiveSubtotal.toFixed(2)}`,
      });
      return res.status(400).json({
        error: `Subtotal mismatch. Expected approximately ${expectedSubtotal.toFixed(2)} from Delivered Quantity × Unit Price.`
      });
    }

    const expectedTotal = parseFloat((effectiveSubtotal + (effectiveSubtotal * taxNum / 100)).toFixed(2));

    if (Math.abs(totalAmountNum - expectedTotal) > 1) {
      await logTransaction('INVOICE_VALIDATION', req.user, 'Flagged', {
        requestId: po.po_id,
        amount: totalAmountNum,
        remarks: `Total mismatch. Expected approx ${expectedTotal.toFixed(2)}, got ${totalAmountNum.toFixed(2)}`,
      });
      return res.status(400).json({
        error: `Total invoice amount does not match billing calculation. Expected approximately ${expectedTotal.toFixed(2)}.`
      });
    }

    let document_path = null;
    if (req.file) {
      document_path = req.file.filename;
    }

    if (!document_path) {
      await logTransaction('INVOICE_VALIDATION', req.user, 'Flagged', {
        requestId: po.po_id,
        amount: totalAmountNum,
        remarks: 'Invoice document missing',
      });
      return res.status(400).json({ error: 'Official invoice document is required for verification' });
    }

    const invoice = await Invoice.create({
      po_id,
      supplier_id:    req.user.user_id,
      invoice_number,
      invoice_date,
      due_date:       due_date || null,
      supplier_name:  supplier_name || null,
      company_name:   company_name || null,
      gstin:          gstin || null,
      po_number:      `PO-${po.po_id}`,
      item_name:      po.RFQ?.PurchaseRequest?.item_name || null,
      ordered_quantity: prQuantity,
      delivered_quantity: deliveredQtyNum,
      delivery_status: deliveryStatus,
      unit_price:     unitPriceNum,
      subtotal:       effectiveSubtotal,
      tax_percent:    tax_percent ? taxNum : null,
      amount:         totalAmountNum,
      quantity:       deliveredQtyNum,
      payment_terms:  payment_terms || null,
      payment_method: payment_method || null,
      details:        remarks || null,
      document_path,
      status:         'PENDING',
    });

    await logTransaction('INVOICE_SUBMITTED', req.user, 'Invoiced', {
      requestId: po.po_id,
      invoiceId: invoice.invoice_id,
      amount: totalAmountNum,
      remarks: `Invoice #${invoice.invoice_number} submitted by supplier`,
    });

    res.status(201).json({ message: 'Invoice uploaded successfully', invoice });
  } catch (err) {
    console.error('uploadInvoice error:', err);
    res.status(500).json({ error: err.message });
  }
};