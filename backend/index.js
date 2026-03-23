require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const managerRoutes = require('./routes/manager');
const financeRoutes = require('./routes/finance');
const exceptionRoutes = require('./routes/exception');
const procurementRoutes = require('./routes/procurement');
const supplierRoutes = require('./routes/supplier');
const aiRoutes = require('./routes/airoute');
const predictionRoutes = require('./routes/predictionRoutes'); 

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/auth', authRoutes);
app.use('/api', aiRoutes);
app.use('/employee', employeeRoutes);
app.use('/manager', managerRoutes);
app.use('/finance', financeRoutes);
app.use('/exceptions', exceptionRoutes);
app.use('/procurement', procurementRoutes);
app.use('/supplier', supplierRoutes);
app.use('/api/predictions', predictionRoutes);

// Simple AI test route
app.get('/ai/test-key', (req, res) => {
  if (!process.env.OPENAI_API_KEY) {  // or GEMINI_API_KEY
    return res.status(500).json({ ok: false, message: 'AI key missing in env' });
  }
  return res.json({ ok: true, message: 'AI key is loaded in backend' });
});

app.get('/', (req, res) => res.json({ message: 'Procurement API running' }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  require('./utils/autoApprove');
});
