const { Sequelize, DataTypes } = require('sequelize');

// 1. Initialize Connection
const sequelize = new Sequelize('Procuro', 'postgres', 'Jyothika@5226', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false, 
});

// ==========================================
// 2. DEFINE MODELS (TABLES)
// ==========================================

// 🔹 IMPROVEMENT 3: Added allowNull: false (NOT NULL)
const User = sequelize.define('User', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.TEXT, allowNull: false },
  role: { type: DataTypes.STRING(50), allowNull: false }, 
  status: { type: DataTypes.STRING(50), defaultValue: 'ACTIVE' }
}, { tableName: 'USERS', createdAt: 'created_at', updatedAt: false });

// 🔹 IMPROVEMENT 1: Added DEPARTMENT_BUDGET Table
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
  total_amount: { type: DataTypes.DECIMAL(12, 2) },
  // 🔹 IMPROVEMENT 2: ENUM-like Status Control
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

// ==========================================
// 3. DEFINE RELATIONSHIPS (FOREIGN KEYS)
// ==========================================

// Users <-> Audit Logs
User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

// Users (Employees) <-> Purchase Requests
User.hasMany(PurchaseRequest, { foreignKey: 'employee_id' });
PurchaseRequest.belongsTo(User, { foreignKey: 'employee_id' });

// Purchase Requests <-> Items
PurchaseRequest.hasMany(PurchaseRequestItem, { foreignKey: 'pr_id', onDelete: 'CASCADE' });
PurchaseRequestItem.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });

// Purchase Requests <-> RFQ
PurchaseRequest.hasOne(RFQ, { foreignKey: 'pr_id' });
RFQ.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });

// Purchase Requests <-> AI Recommendations
PurchaseRequest.hasMany(AIRecommendation, { foreignKey: 'pr_id' });
AIRecommendation.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });

// Users (Suppliers) <-> AI Recommendations
User.hasMany(AIRecommendation, { foreignKey: 'suggested_supplier' });
AIRecommendation.belongsTo(User, { foreignKey: 'suggested_supplier' });

// RFQ <-> Quotations
RFQ.hasMany(Quotation, { foreignKey: 'rfq_id' });
Quotation.belongsTo(RFQ, { foreignKey: 'rfq_id' });

// Users (Suppliers) <-> Quotations
User.hasMany(Quotation, { foreignKey: 'supplier_id' });
Quotation.belongsTo(User, { foreignKey: 'supplier_id' });

// RFQ <-> Purchase Orders
RFQ.hasOne(PurchaseOrder, { foreignKey: 'rfq_id' });
PurchaseOrder.belongsTo(RFQ, { foreignKey: 'rfq_id' });

// Users (Suppliers) <-> Purchase Orders
User.hasMany(PurchaseOrder, { foreignKey: 'supplier_id' });
PurchaseOrder.belongsTo(User, { foreignKey: 'supplier_id' });

// Purchase Orders <-> Invoices
PurchaseOrder.hasMany(Invoice, { foreignKey: 'po_id' });
Invoice.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });

// Users (Suppliers) <-> Invoices
User.hasMany(Invoice, { foreignKey: 'supplier_id' });
Invoice.belongsTo(User, { foreignKey: 'supplier_id' });

// Invoices <-> Payments
Invoice.hasMany(Payment, { foreignKey: 'invoice_id' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id' });

// ==========================================
// 4. SYNC DATABASE
// ==========================================

const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Sequelize connected to PostgreSQL successfully.');
    
    // Using alter: true will modify your existing tables to match these new strict rules
    await sequelize.sync({ alter: true }); 
    console.log('Database synced. Added Budget table, ENUMs, and NOT NULL constraints.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

initDatabase();

module.exports = {
  sequelize, User, DepartmentBudget, AuditLog, PurchaseRequest, PurchaseRequestItem, 
  RFQ, Quotation, AIRecommendation, PurchaseOrder, Invoice, Payment
};