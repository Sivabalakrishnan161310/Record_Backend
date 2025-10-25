const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const supportRoutes = require('./routes/support');

dotenv.config();

const app = express();

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    console.error('Connection string:', process.env.MONGODB_URI ? 'Present' : 'Missing');
  });

// ✅ Monitor MongoDB connection
mongoose.connection.on('connected', () => console.log('✅ Mongoose connected'));
mongoose.connection.on('error', (err) => console.error('❌ Mongoose error:', err));
mongoose.connection.on('disconnected', () => console.log('⚠️ Mongoose disconnected'));

// ✅ Global CORS Middleware (works for both local + Vercel)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight requests quickly
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Request Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
  });
  next();
});

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/support', supportRoutes);

// ✅ Root Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Record Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      support: '/api/support',
    },
  });
});

// ✅ Health Check Route
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  res.json({
    success: true,
    message: 'Server is running',
    database: states[dbState],
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ✅ Test DB Connection
app.get('/api/test-db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
      res.json({ success: true, message: 'Database connected successfully', state: 'Connected' });
    } else {
      res.status(503).json({ success: false, message: 'Database not connected', state: dbState });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;

// ✅ Always start server (needed for Vercel middleware initialization)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for all origins`);
});

// ✅ Export app for Vercel serverless
module.exports = app;
