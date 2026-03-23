const { TransactionLog, User } = require('../db');

async function resolvePerformedBy(user) {
  if (!user) return 'System';

  if (typeof user === 'string') {
    return user;
  }

  if (user.name && user.role) {
    return `${user.name} (${user.role})`;
  }

  if (user.user_id) {
    const dbUser = await User.findByPk(user.user_id, {
      attributes: ['name', 'role']
    });

    if (dbUser) {
      return `${dbUser.name} (${dbUser.role})`;
    }

    if (user.role) {
      return `User#${user.user_id} (${user.role})`;
    }

    return `User#${user.user_id}`;
  }

  return user.role ? `Unknown (${user.role})` : 'System';
}

async function logTransaction(action, user, status, details = {}) {
  const performedBy = await resolvePerformedBy(user);

  return TransactionLog.create({
    action,
    status,
    request_id: details.requestId || details.po_id || null,
    invoice_id: details.invoiceId || details.invoice_id || null,
    payment_id: details.paymentId || details.razorpay_payment_id || null,
    amount: details.amount != null ? parseFloat(details.amount) : null,
    performed_by: performedBy,
    remarks: details.remarks || null,
  });
}

module.exports = { logTransaction };
