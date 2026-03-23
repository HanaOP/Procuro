/**
 * autoApprove.js
 * Runs every 30 seconds and auto-approves supplier selections
 * where manager hasn't raised an objection within 5 minutes (demo).
 */

const { SupplierApprovalRequest } = require('../db');
const { Op } = require('sequelize');
const { _finalizeSupplierSelection } = require('../controllers/supplierApprovalController');

async function runAutoApprove() {
  try {
    const expired = await SupplierApprovalRequest.findAll({
      where: {
        status:          'PENDING_MANAGER_REVIEW',
        review_deadline: { [Op.lt]: new Date() },
        auto_approved:   false,
      },
    });

    for (const approval of expired) {
      try {
        console.log(`⏰ Auto-approving supplier selection #${approval.approval_id} (5 min deadline passed)`);
        await _finalizeSupplierSelection(approval);
        approval.status        = 'APPROVED';
        approval.auto_approved = true;
        approval.reviewed_at   = new Date();
        await approval.save();
        console.log(`✅ Auto-approved supplier for PR #${approval.pr_id}`);
      } catch (err) {
        console.error(`❌ Auto-approve failed for #${approval.approval_id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Auto-approve cron error:', err.message);
  }
}

setInterval(runAutoApprove, 30 * 1000);
runAutoApprove();
console.log('⏰ Auto-approve cron started (checks every 30s, 5 min window)');

module.exports = { runAutoApprove };