const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  googleAuth,
  verifyToken,
  getUserProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/verify', verifyToken);

// Protected routes
router.get('/profile', protect, getUserProfile);

module.exports = router;