require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { seedData } = require('./services/seedService');
const User = require('./models/User');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const documentTypeRoutes = require('./routes/documentTypeRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const documentRoutes = require('./routes/documentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/error');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', async (req, res) => {
  const userCount = await User.countDocuments();
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: true,
      userCount
    }
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/document-types', documentTypeRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found`
  });
});

// Global Error Handler
app.use(errorHandler);

// Server startup
async function startServer() {
  try {
    console.log('[Server] Connecting to database...');
    await connectDB();

    // Auto-seed missing users and document types (idempotent, never wipes existing data)
    console.log('[Server] Ensuring database seeds & test accounts are present...');
    await seedData();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  Academic Workflow Server running on port ${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`  Client Origin: ${CLIENT_URL}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Server] Fatal error during startup:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
