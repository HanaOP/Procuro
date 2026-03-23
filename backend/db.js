const { Sequelize, DataTypes } = require('sequelize');

// 1. Initialize Connection
const sequelize = new Sequelize('erp_procuro', 'postgres', 'hana123', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5433,        // ← add this line
  logging: false,
});

// ==========================================
// 2. DEFINE MODELS (TABLES)
// ==========================================


const User = sequelize.define('User', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.TEXT, allowNull: false },
  role: { type: DataTypes.STRING(50), allowNull: false },
  department: { type: DataTypes.STRING(100), allowNull: true },  // ← added
  status: { type: DataTypes.STRING(50), defaultValue: 'ACTIVE' },

  // OTP + verification fields
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  otp_code: { type: DataTypes.STRING, allowNull: true },
  otp_expires_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'USERS',
  createdAt: 'created_at',
  updatedAt: false
});

// (all your other models unchanged)
const DepartmentBudget = sequelize.define('DepartmentBudget', {
  budget_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  department: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  total_allocated: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  used_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  remaining_amount: { type: DataTypes.DECIMAL(12, 2) },
  financial_year: { type: DataTypes.STRING(20), allowNull: false }
}, { tableName: 'DEPARTMENT_BUDGET', timestamps: false });

const AuditLog = sequelize.define('AuditLog', {
  log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  action: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'AUDIT_LOGS', timestamps: false });

const PurchaseRequest = sequelize.define('PurchaseRequest', {
  pr_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  department: { type: DataTypes.STRING(100), allowNull: false },

  // Employee form fields
  item_name: { type: DataTypes.STRING, allowNull: false },
  item_details: { type: DataTypes.TEXT },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  estimated_unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  category: { type: DataTypes.STRING(100), allowNull: false },
  required_by: { type: DataTypes.DATEONLY, allowNull: false },
  delivery_location: { type: DataTypes.STRING(200), allowNull: true },
  priority: { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'), allowNull: false },
  document_path: { type: DataTypes.STRING(500), allowNull: true },

  total_amount: { type: DataTypes.DECIMAL(12, 2) },

  // Reason for rejection / manager notes
  manager_comment: { type: DataTypes.TEXT },

  // Optional field for clarification message (if you want it stored)
  clarification_message: { type: DataTypes.TEXT },
  clarification_reply: { type: DataTypes.TEXT, allowNull: true },

  // Mark as draft or final
  is_draft: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Status enum
  status: {
    type: DataTypes.ENUM(
      'PENDING_MANAGER',
      'PENDING_FINANCE',
      'PENDING_PROCUREMENT',
      'RFQ_SENT',
      'SUPPLIER_SELECTED',
      'ORDER_PLACED',
      'DELIVERED',
      'COMPLETED',
      'REJECTED'
    ),
    allowNull: false,
    defaultValue: 'PENDING_MANAGER'
  }
}, { tableName: 'PURCHASE_REQUESTS', createdAt: 'created_at', updatedAt: false });

const PurchaseRequestItem = sequelize.define('PurchaseRequestItem', {
  item_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  item_name: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  specifications: { type: DataTypes.TEXT }
}, { tableName: 'PURCHASE_REQUEST_ITEMS', timestamps: false });

const RFQ = sequelize.define('RFQ', {
  rfq_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deadline: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'OPEN' }
}, { tableName: 'RFQ', timestamps: false });

const Quotation = sequelize.define('Quotation', {
  quotation_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  delivery_time: { type: DataTypes.STRING(100) },
  terms: { type: DataTypes.TEXT },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'QUOTATIONS', timestamps: false });

const AIRecommendation = sequelize.define('AIRecommendation', {
  recommendation_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cost_saving: { type: DataTypes.DECIMAL(12, 2) }
}, { tableName: 'AI_RECOMMENDATIONS', createdAt: 'created_at', updatedAt: false });

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  po_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'ISSUED' },
  issued_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW }
}, { tableName: 'PURCHASE_ORDERS', timestamps: false });

const Invoice = sequelize.define('Invoice', {
  invoice_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: { type: DataTypes.STRING(50), defaultValue: 'PENDING' }
}, { tableName: 'INVOICES', timestamps: false });

const Payment = sequelize.define('Payment', {
  payment_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payment_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  payment_method: { type: DataTypes.STRING(50) }
}, { tableName: 'PAYMENTS', timestamps: false });

// NEW: Exception model
const Exception = sequelize.define('Exception', {
  exception_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  exception_type: { type: DataTypes.STRING(100), allowNull: false },
  urgency_level: { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  document_path: { type: DataTypes.STRING(300) }
}, { tableName: 'EXCEPTIONS', createdAt: 'created_at', updatedAt: false });

//SupplierApprovalRequest
const SupplierApprovalRequest = sequelize.define('SupplierApprovalRequest', {
  approval_id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_id:              { type: DataTypes.INTEGER, allowNull: false },
  pr_id:                     { type: DataTypes.INTEGER, allowNull: false },
  supplier_id:               { type: DataTypes.INTEGER, allowNull: false },
  procurement_user_id:       { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM(
      'PENDING_MANAGER_REVIEW',
      'MANAGER_OBJECTED',
      'CLARIFICATION_GIVEN',
      'APPROVED',
      'REJECTED'
    ),
    defaultValue: 'PENDING_MANAGER_REVIEW',
    allowNull: false
  },
  manager_objection:         { type: DataTypes.TEXT,    allowNull: true },
  procurement_clarification: { type: DataTypes.TEXT,    allowNull: true },
  selected_at:               { type: DataTypes.DATE,    defaultValue: DataTypes.NOW },
  review_deadline:           { type: DataTypes.DATE,    allowNull: false },
  reviewed_at:               { type: DataTypes.DATE,    allowNull: true },
  auto_approved:             { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'SUPPLIER_APPROVAL_REQUESTS', createdAt: 'created_at', updatedAt: false });
 
// ==========================================
// 3. DEFINE RELATIONSHIPS (FOREIGN KEYS)
// ==========================================

User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(PurchaseRequest, { foreignKey: 'employee_id' });
PurchaseRequest.belongsTo(User, { foreignKey: 'employee_id' });

PurchaseRequest.hasMany(PurchaseRequestItem, { foreignKey: 'pr_id', onDelete: 'CASCADE' });
PurchaseRequestItem.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });

PurchaseRequest.hasOne(RFQ, { foreignKey: 'pr_id' });
RFQ.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });

PurchaseRequest.hasMany(AIRecommendation, { foreignKey: 'pr_id' });
AIRecommendation.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });

User.hasMany(AIRecommendation, { foreignKey: 'suggested_supplier' });
AIRecommendation.belongsTo(User, { foreignKey: 'suggested_supplier' });

RFQ.hasMany(Quotation, { foreignKey: 'rfq_id' });
Quotation.belongsTo(RFQ, { foreignKey: 'rfq_id' });

User.hasMany(Quotation, { foreignKey: 'supplier_id' });
Quotation.belongsTo(User, { foreignKey: 'supplier_id' });

RFQ.hasOne(PurchaseOrder, { foreignKey: 'rfq_id' });
PurchaseOrder.belongsTo(RFQ, { foreignKey: 'rfq_id' });

User.hasMany(PurchaseOrder, { foreignKey: 'supplier_id' });
PurchaseOrder.belongsTo(User, { foreignKey: 'supplier_id' });

PurchaseOrder.hasMany(Invoice, { foreignKey: 'po_id' });
Invoice.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });

User.hasMany(Invoice, { foreignKey: 'supplier_id' });
Invoice.belongsTo(User, { foreignKey: 'supplier_id' });

Invoice.hasMany(Payment, { foreignKey: 'invoice_id' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id' });

// NEW: relations for Exception
PurchaseRequest.hasMany(Exception, { foreignKey: 'pr_id' });
Exception.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });

User.hasMany(Exception, { foreignKey: 'employee_id' });
Exception.belongsTo(User, { foreignKey: 'employee_id' });


SupplierApprovalRequest.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });
PurchaseRequest.hasMany(SupplierApprovalRequest,   { foreignKey: 'pr_id' });
 
SupplierApprovalRequest.belongsTo(Quotation, { foreignKey: 'quotation_id' });
 
SupplierApprovalRequest.belongsTo(User, { as: 'Supplier',        foreignKey: 'supplier_id' });
SupplierApprovalRequest.belongsTo(User, { as: 'ProcurementUser', foreignKey: 'procurement_user_id' });
// ==========================================
// 4. SYNC DATABASE
// ==========================================

const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Sequelize connected to PostgreSQL successfully.');
    await sequelize.sync({ alter: true });
    console.log('Database synced. Added new fields and Exception table.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

initDatabase();

module.exports = {
  sequelize,
  User,
  DepartmentBudget,
  AuditLog,
  PurchaseRequest,
  PurchaseRequestItem,
  RFQ,
  Quotation,
  AIRecommendation,
  PurchaseOrder,
  Invoice,
  Payment,
  Exception,
  SupplierApprovalRequest
};
