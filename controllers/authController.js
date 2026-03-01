const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password_hash: hash, role: role || 'EMPLOYEE', status: 'ACTIVE' });
    res.json({ message: 'User registered', user_id: user.user_id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful', token, user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { register, login };
