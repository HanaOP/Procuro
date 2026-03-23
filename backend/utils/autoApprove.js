/**
 * autoApprove.js
 * Runs every 30 seconds and auto-approves supplier selections
 * where manager hasn't raised an objection within the deadline.
 *
 * Add to your index.js:
 *   require('./utils/autoApprove');
 */

const { SupplierApprovalRequest, PurchaseRequest } = require('../db');
const { Op } = require('sequelize');
const { _finalizeSupplierSelection } = require('../controllers/supplierApprovalController');

async function runAutoApprove() {
  try {
    // Find all approvals where:
    // 1. Status is still PENDING_MANAGER_REVIEW
    // 2. Deadline has passed
    const expired = await SupplierApprovalRequest.findAll({
      where: {
        status:          'PENDING_MANAGER_REVIEW',
        review_deadline: { [Op.lt]: new Date() }, // deadline < now
        auto_approved:   false,
      },
    });

    for (const approval of expired) {
      try {
        console.log(`⏰ Auto-approving supplier selection #${approval.approval_id} (deadline passed)`);

        // Finalize: create PO, update PR status
        await _finalizeSupplierSelection(approval);

        // Mark as auto-approved
        approval.status       = 'APPROVED';
        approval.auto_approved = true;
        approval.reviewed_at  = new Date();
        await approval.save();

        console.log(`✅ Auto-approved supplier for PR #${approval.pr_id}`);
      } catch (err) {
        console.error(`❌ Auto-approve failed for approval #${approval.approval_id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Auto-approve cron error:', err.message);
  }
}

// Run every 30 seconds
const INTERVAL_MS = 30 * 1000;
setInterval(runAutoApprove, INTERVAL_MS);

// Also run once immediately on startup
runAutoApprove();

console.log('⏰ Auto-approve cron job started (checks every 30 seconds)');

module.exports = { runAutoApprove };