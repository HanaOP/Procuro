require('dotenv').config();

const express = require('express');
const cors = require('cors');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const {
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
  Exception
} = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// =================== AUTH MIDDLEWARE ===================

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer <token>"
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { user_id, role, ... }
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// =================== AUTH ROUTES ===================

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password_hash: hash,
      role: role || 'EMPLOYEE',
      status: 'ACTIVE'
    });

    res.json({ message: 'User registered', user_id: user.user_id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Procurement API running' });
});

// =================== EMPLOYEE: REQUESTS ===================

// Create / submit purchase request (supports draft via ?draft=true)
app.post('/employee/requests', authMiddleware, async (req, res) => {
  try {
    const { user_id, role } = req.user;
    const isDraft = req.query.draft === 'true';

    if (role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Only employees can create requests' });
    }

    const {
      item_name,
      item_details,
      quantity,
      estimated_unit_price,
      category,
      required_by,
      delivery_location,
      priority,
      department
    } = req.body;

    if (
      !item_name ||
      (!quantity && quantity !== 0) ||
      (!estimated_unit_price && estimated_unit_price !== 0) ||
      !category ||
      !required_by ||
      !delivery_location ||
      !priority ||
      !department
    ) {
      return res.status(400).json({ error: 'Please fill all required fields' });
    }

    if (typeof quantity !== 'number' || quantity < 1 || quantity > 100) {
      return res.status(400).json({ error: 'Quantity must be a number between 1 and 100' });
    }

    if (typeof estimated_unit_price !== 'number' || estimated_unit_price <= 0) {
      return res.status(400).json({ error: 'Estimated unit price must be a positive number' });
    }

    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be LOW, MEDIUM, or HIGH' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reqDate = new Date(required_by);
    if (isNaN(reqDate.getTime())) {
      return res.status(400).json({ error: 'required_by must be a valid date (YYYY-MM-DD)' });
    }
    reqDate.setHours(0, 0, 0, 0);
    if (reqDate < today) {
      return res.status(400).json({ error: 'required_by date cannot be in the past' });
    }

    const total_amount = quantity * estimated_unit_price;

    const pr = await PurchaseRequest.create({
      employee_id: user_id,
      department,
      item_name,
      item_details: item_details || '',
      quantity,
      estimated_unit_price,
      category,
      required_by: reqDate,
      delivery_location,
      priority,
      total_amount,
      is_draft: isDraft,
      status: 'PENDING_MANAGER'
    });

    return res.status(201).json({
      message: 'Purchase request submitted',
      request: pr
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Employee: all own requests
app.get('/employee/requests', authMiddleware, async (req, res) => {
  try {
    const { user_id, role } = req.user;

    if (role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Only employees can view this' });
    }

    const requests = await PurchaseRequest.findAll({
      where: { employee_id: user_id },
      order: [['created_at', 'DESC']]
    });

    return res.json(requests);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Employee: drafts only
app.get('/employee/requests/drafts', authMiddleware, async (req, res) => {
  try {
    const { user_id, role } = req.user;

    if (role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Only employees can view this' });
    }

    const drafts = await PurchaseRequest.findAll({
      where: { employee_id: user_id, is_draft: true },
      order: [['created_at', 'DESC']]
    });

    return res.json(drafts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Employee: rejected only
app.get('/employee/requests/rejected', authMiddleware, async (req, res) => {
  try {
    const { user_id, role } = req.user;

    if (role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Only employees can view this' });
    }

    const rejected = await PurchaseRequest.findAll({
      where: { employee_id: user_id, status: 'REJECTED' },
      order: [['created_at', 'DESC']]
    });

    return res.json(rejected);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Employee: edit draft
app.put('/employee/requests/:id', authMiddleware, async (req, res) => {
  try {
    const { user_id, role } = req.user;
    const pr_id = req.params.id;

    if (role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Only employees can edit requests' });
    }

    const pr = await PurchaseRequest.findOne({
      where: { pr_id, employee_id: user_id }
    });

    if (!pr) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (!pr.is_draft) {
      return res.status(400).json({ error: 'Only draft requests can be edited' });
    }

    const {
      item_name,
      item_details,
      quantity,
      estimated_unit_price,
      category,
      required_by,
      delivery_location,
      priority,
      department
    } = req.body;

    if (item_name !== undefined) pr.item_name = item_name;
    if (item_details !== undefined) pr.item_details = item_details;
    if (quantity !== undefined) pr.quantity = quantity;
    if (estimated_unit_price !== undefined) pr.estimated_unit_price = estimated_unit_price;
    if (category !== undefined) pr.category = category;
    if (required_by !== undefined) pr.required_by = required_by;
    if (delivery_location !== undefined) pr.delivery_location = delivery_location;
    if (priority !== undefined) pr.priority = priority;
    if (department !== undefined) pr.department = department;

    if (pr.quantity && pr.estimated_unit_price) {
      pr.total_amount = pr.quantity * pr.estimated_unit_price;
    }

    await pr.save();

    return res.json({
      message: 'Draft purchase request updated',
      request: pr
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// =================== MANAGER ROUTES ===================

// Manager: pending requests
app.get('/manager/requests/pending', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can view this' });
    }

    const pending = await PurchaseRequest.findAll({
      where: { status: 'PENDING_MANAGER' },
      order: [['created_at', 'DESC']]
    });

    return res.json(pending);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manager: high priority pending
app.get('/manager/requests/high-priority', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can view this' });
    }

    const high = await PurchaseRequest.findAll({
      where: { status: 'PENDING_MANAGER', priority: 'HIGH' },
      order: [['created_at', 'DESC']]
    });

    return res.json(high);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manager: rejected list
app.get('/manager/requests/rejected', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can view this' });
    }

    const rejected = await PurchaseRequest.findAll({
      where: { status: 'REJECTED' },
      order: [['created_at', 'DESC']]
    });

    return res.json(rejected);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manager: send back request for clarification (message only)
app.post('/manager/requests/:id/clarify', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;
    const { message } = req.body;

    if (role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can request clarification' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Clarification message is required' });
    }

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (pr.status !== 'PENDING_MANAGER') {
      return res.status(400).json({ error: 'Only pending manager requests can be sent for clarification' });
    }

    pr.clarification_message = message; // field defined in PurchaseRequest model
    // keep status as PENDING_MANAGER
    await pr.save();

    return res.json({
      message: 'Clarification message saved for employee',
      request: pr
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manager: approve
app.put('/manager/requests/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;

    if (role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can approve requests' });
    }

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (pr.status !== 'PENDING_MANAGER') {
      return res.status(400).json({ error: 'Request is not pending manager approval' });
    }

    pr.status =  'PENDING_FINANCE';;
    await pr.save();

    return res.json({
      message: 'Request approved by manager',
      request: pr
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manager: reject with comment
app.post('/manager/requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;
    const { manager_comment } = req.body;

    if (role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can reject requests' });
    }

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (pr.status !== 'PENDING_MANAGER') {
      return res.status(400).json({ error: 'Request is not pending manager approval' });
    }

    pr.status = 'REJECTED';
    pr.manager_comment = manager_comment || null;
    await pr.save();

    return res.json({
      message: 'Request rejected by manager',
      request: pr
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manager: approved (sent to procurement)
app.get('/manager/requests/approved', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can view this' });
    }

    const approved = await PurchaseRequest.findAll({
      where: { status: 'PENDING_FINANCE' },
      order: [['created_at', 'DESC']]
    });

    return res.json(approved);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

//finance budget form data collection
app.post('/finance/budget', authMiddleware, async (req, res) => {
  try {
    // Only finance officer allowed
    if (req.user.role !== 'FINANCE_OFFICER') {
      return res.status(403).json({ error: 'Only finance officers can add budget' });
    }

    const { department, total_allocated, financial_year } = req.body;

    if (!department || !total_allocated || !financial_year) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Prevent duplicate budget for same year
    const existing = await DepartmentBudget.findOne({
      where: { department, financial_year }
    });

    if (existing) {
      return res.status(400).json({
        error: 'Budget already exists for this department for this financial year'
      });
    }

    const newBudget = await DepartmentBudget.create({
      department,
      total_allocated: parseFloat(total_allocated),
      used_amount: 0,
      remaining_amount: parseFloat(total_allocated),
      financial_year
    });

    res.status(201).json({
      message: 'Budget added successfully',
      budget: newBudget
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// finance requests
app.get('/finance/requests/pending', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'FINANCE_OFFICER') {
      return res.status(403).json({ error: 'Only finance officers can view this' });
    }

    const requests = await PurchaseRequest.findAll({
      where: { status: 'PENDING_FINANCE' },
      order: [['created_at', 'DESC']]
    });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
//approve and deduct budget by finance
app.post('/finance/requests/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;

    if (role !== 'FINANCE_OFFICER') {
      return res.status(403).json({ error: 'Only finance officers can approve' });
    }

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) return res.status(404).json({ error: 'Request not found' });

    if (pr.status !== 'PENDING_FINANCE') {
      return res.status(400).json({ error: 'Not pending finance approval' });
    }

    const budget = await DepartmentBudget.findOne({
      where: { department: pr.department }
    });

    if (!budget) {
      return res.status(404).json({ error: 'Department budget not found' });
    }

    if (parseFloat(budget.remaining_amount) < parseFloat(pr.total_amount)) {
      return res.status(400).json({ error: 'Insufficient budget' });
    }

    // Deduct budget
    budget.used_amount = parseFloat(budget.used_amount) + parseFloat(pr.total_amount);
    budget.remaining_amount =
      parseFloat(budget.total_allocated) - parseFloat(budget.used_amount);

    await budget.save();

    pr.status = 'PENDING_PROCUREMENT';
    await pr.save();

    res.json({ message: 'Finance approved. Sent to procurement.', request: pr });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
//finance reject
app.post('/finance/requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    const pr_id = req.params.id;

    if (role !== 'FINANCE_OFFICER') {
      return res.status(403).json({ error: 'Only finance officers can reject' });
    }

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) return res.status(404).json({ error: 'Request not found' });

    pr.status = 'REJECTED';
    pr.manager_comment = 'Rejected by finance';
    await pr.save();

    res.json({ message: 'Request rejected by finance' });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// =================== EXCEPTIONS ===================

// Employee: raise exception for a request
app.post('/employee/requests/:id/exception', authMiddleware, async (req, res) => {
  try {
    const { user_id, role } = req.user;
    const pr_id = req.params.id;

    if (role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Only employees can raise exceptions' });
    }

    const pr = await PurchaseRequest.findOne({
      where: { pr_id, employee_id: user_id }
    });

    if (!pr) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { exception_type, urgency_level, reason } = req.body;

    if (!exception_type || !urgency_level || !reason) {
      return res.status(400).json({ error: 'exception_type, urgency_level and reason are required' });
    }

    const allowedUrgency = ['LOW', 'MEDIUM', 'HIGH'];
    if (!allowedUrgency.includes(urgency_level)) {
      return res.status(400).json({ error: 'urgency_level must be LOW, MEDIUM, or HIGH' });
    }

    const exc = await Exception.create({
      pr_id,
      employee_id: user_id,
      exception_type,
      urgency_level,
      reason,
      document_path: null // file upload to be added later
    });

    return res.status(201).json({
      message: 'Exception raised',
      exception: exc
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Manager: view exceptions
app.get('/manager/exceptions', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only managers can view this' });
    }

    const exceptions = await Exception.findAll({
      include: [PurchaseRequest, User],
      order: [['created_at', 'DESC']]
    });

    return res.json(exceptions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// =================== AI SUGGESTIONS (placeholder) ===================

// Employee: view AI suggestions for a request
app.get('/employee/requests/:id/suggestions', authMiddleware, async (req, res) => {
  try {
    const { user_id, role } = req.user;
    const pr_id = req.params.id;

    if (role !== 'EMPLOYEE') {
      return res.status(403).json({ error: 'Only employees can view suggestions' });
    }

    const pr = await PurchaseRequest.findOne({
      where: { pr_id, employee_id: user_id }
    });

    if (!pr) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const suggestions = await AIRecommendation.findAll({
      where: { pr_id }
    });

    return res.json(suggestions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// =================== RFQ + SUPPLIER (existing) ===================

app.get('/purchase-requests', async (req, res) => {
  try {
    const prs = await PurchaseRequest.findAll({ include: [PurchaseRequestItem] });
    res.json(prs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/purchase-requests', async (req, res) => {
  try {
    const prs = await PurchaseRequest.findAll();
    res.json(prs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/rfq/send', async (req, res) => {
  try {
    const { pr_id, deadline } = req.body;

    const pr = await PurchaseRequest.findByPk(pr_id);
    if (!pr) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    if (pr.status !== 'PENDING_PROCUREMENT') {
      return res.status(400).json({ error: 'PR not ready for RFQ' });
    }

    const rfq = await RFQ.create({
      pr_id,
      deadline,
      status: 'OPEN'
    });

    pr.status = 'RFQ_SENT';
    await pr.save();

    res.json({ message: 'RFQ sent', rfq });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/supplier/rfqs', async (req, res) => {
  try {
    const rfqs = await RFQ.findAll({
      include: [PurchaseRequest],
      where: { status: 'OPEN' }
    });

    res.json(rfqs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/purchase-requests', async (req, res) => {
  try {
    const pr = await PurchaseRequest.create(req.body);
    res.json(pr);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
