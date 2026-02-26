require('dotenv').config(); //to read the .env file

const express = require('express');
const cors = require('cors');

//jwt
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
} = require('./db');  // <-- this is your file above

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());


// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
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

// Login
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

// Simple health check
app.get('/', (req, res) => {
  res.json({ message: 'Procurement API running' });
});

// Example: create a user
app.post('/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});



// Example: list all purchase requests
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


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
