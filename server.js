const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const supportRoutes = require('./routes/support');

dotenv.config();

const app = express();

// ===============================
// 🔹 1. MongoDB Connection
// ===============================
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Connection string:', process.env.MONGODB_URI ? 'Present' : 'Missing');
});

// Monitor connection status
mongoose.connection.on('connected', () => console.log('✅ Mongoose connected'));
mongoose.connection.on('error', err => console.error('❌ Mongoose error:', err));
mongoose.connection.on('disconnected', () => console.log('⚠️ Mongoose disconnected'));

// ===============================
// 🔹 2. CORS Setup (Allow All)
// ===============================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Alternatively use CORS middleware for all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.options('*', cors()); // Handle preflight globally

// ===============================
// 🔹 3. Middleware
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (optional but useful)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
  });
  next();
});

// ===============================
// 🔹 4. Routes
// ===============================
app.use('/api/auth', authRoutes);
app.use('/api/support', supportRoutes);

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

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  res.json({
    success: true,
    message: 'Server running fine',
    database: states[dbState],
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/test-db', (req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    res.json({ success: true, message: 'DB connected', state: 'Connected' });
  } else {
    res.status(503).json({ success: false, message: 'DB not connected', state: dbState });
  }
});

// ===============================
// 🔹 5. Error Handling
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ===============================
// 🔹 6. Server Export for Vercel
// ===============================

// 🚫 Don't use app.listen() in Vercel — export app instead
module.exports = app;

// ✅ If running locally (development), enable app.listen
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}
