require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const managerRoutes = require('./routes/manager');
const financeRoutes = require('./routes/finance');
const exceptionRoutes = require('./routes/exception');
const procurementRoutes = require('./routes/procurement');

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/employee', employeeRoutes);
app.use('/manager', managerRoutes);
app.use('/finance', financeRoutes);
app.use('/exceptions', exceptionRoutes);
app.use('/procurement', procurementRoutes);

app.get('/', (req, res) => res.json({ message: 'Procurement API running' }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
