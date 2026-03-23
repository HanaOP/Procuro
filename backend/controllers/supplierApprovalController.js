/**
 * supplierApprovalController.js
 * Handles manager review of supplier selections
 */

const {
  SupplierApprovalRequest,
  PurchaseRequest,
  PurchaseOrder,
  Quotation,
  RFQ,
  User,
} = require('../db');
const { logTransaction } = require('../utils/transactionLogger');

// ================= GET PENDING SUPPLIER SELECTIONS (for manager) =================
exports.getPendingSupplierApprovals = async (req, res) => {
  try {
    const approvals = await SupplierApprovalRequest.findAll({
      where: { status: ['PENDING_MANAGER_REVIEW', 'CLARIFICATION_GIVEN'] },
      include: [
        { model: PurchaseRequest },
        { model: Quotation },
        { model: User, as: 'Supplier', attributes: ['user_id', 'name', 'email'] },
        { model: User, as: 'ProcurementUser', attributes: ['user_id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= GET ALL SUPPLIER APPROVALS HISTORY =================
exports.getAllSupplierApprovals = async (req, res) => {
  try {
    const approvals = await SupplierApprovalRequest.findAll({
      include: [
        { model: PurchaseRequest },
        { model: Quotation },
        { model: User, as: 'Supplier', attributes: ['user_id', 'name', 'email'] },
        { model: User, as: 'ProcurementUser', attributes: ['user_id', 'name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= RAISE OBJECTION =================
exports.raiseObjection = async (req, res) => {
  try {
    const { approval_id } = req.params;
    const { objection } = req.body;

    if (!objection) return res.status(400).json({ error: 'Objection reason is required' });

    const approval = await SupplierApprovalRequest.findByPk(approval_id);
    if (!approval) return res.status(404).json({ error: 'Approval request not found' });

    if (approval.status !== 'PENDING_MANAGER_REVIEW') {
      return res.status(400).json({ error: `Cannot raise objection. Current status: ${approval.status}` });
    }

    // Check if deadline has passed
    if (new Date() > new Date(approval.review_deadline)) {
      return res.status(400).json({ error: 'Review deadline has passed. Supplier has been auto-approved.' });
    }

    approval.manager_objection = objection;
    approval.status = 'MANAGER_OBJECTED';
    approval.reviewed_at = new Date();
    await approval.save();

    res.json({ message: 'Objection raised. Procurement officer will be notified to provide clarification.', approval });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= APPROVE SUPPLIER (after clarification) =================
exports.approveSupplier = async (req, res) => {
  try {
    const { approval_id } = req.params;

    const approval = await SupplierApprovalRequest.findByPk(approval_id, {
      include: [{ model: Quotation, include: [RFQ] }],
    });
    if (!approval) return res.status(404).json({ error: 'Approval request not found' });

    if (!['PENDING_MANAGER_REVIEW', 'CLARIFICATION_GIVEN'].includes(approval.status)) {
      return res.status(400).json({ error: `Cannot approve. Current status: ${approval.status}` });
    }

    // Create purchase order and notify supplier
    await _finalizeSupplierSelection(approval, req.user);

    approval.status = 'APPROVED';
    approval.reviewed_at = new Date();
    approval.auto_approved = false;
    await approval.save();

    res.json({ message: 'Supplier approved. Purchase order created and supplier notified.', approval });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= REJECT SUPPLIER (abort PR) =================
exports.rejectSupplier = async (req, res) => {
  try {
    const { approval_id } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

    const approval = await SupplierApprovalRequest.findByPk(approval_id);
    if (!approval) return res.status(404).json({ error: 'Approval request not found' });

    if (!['MANAGER_OBJECTED', 'CLARIFICATION_GIVEN'].includes(approval.status)) {
      return res.status(400).json({ error: `Cannot reject. Current status: ${approval.status}` });
    }

    // Re-open the purchase request for procurement to send a fresh RFQ cycle
    const pr = await PurchaseRequest.findByPk(approval.pr_id);
    if (pr) {
      pr.status = 'PENDING_PROCUREMENT';
      pr.manager_comment = `Supplier selection not satisfactory: ${reason}`;
      await pr.save();
    }

    // Close the previous RFQ to prevent new quotes on the rejected supplier cycle.
    const quotation = await Quotation.findByPk(approval.quotation_id);
    if (quotation) {
      const rfq = await RFQ.findByPk(quotation.rfq_id);
      if (rfq) {
        rfq.status = 'CLOSED';
        await rfq.save();
      }
    }

    approval.status = 'REJECTED';
    approval.manager_objection = reason;
    approval.reviewed_at = new Date();
    await approval.save();

    res.json({ message: 'Supplier selection marked not satisfactory. Request moved back to procurement as pending RFQ.', approval });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= HELPER: Finalize supplier selection =================
async function _finalizeSupplierSelection(approval, actor = null) {
  const quotation = await Quotation.findByPk(approval.quotation_id, { include: [RFQ] });
  const pr        = await PurchaseRequest.findByPk(approval.pr_id);

  // Create Purchase Order
  const purchaseOrder = await PurchaseOrder.create({
    rfq_id:      quotation.rfq_id,
    supplier_id: approval.supplier_id,
    total_amount: quotation.price,
    status:      'ISSUED',
  });

  await logTransaction(
    'PURCHASE_ORDER_CREATED',
    actor || 'System (AUTO_APPROVE)',
    'Requested',
    {
      requestId: purchaseOrder.po_id,
      amount: quotation.price,
      remarks: `PO created from supplier approval #${approval.approval_id}`,
    }
  );

  // Update PR status — supplier is now officially selected
  pr.status = 'ORDER_PLACED';
  await pr.save();
}

// Export helper for use in cron job
exports._finalizeSupplierSelection = _finalizeSupplierSelection;