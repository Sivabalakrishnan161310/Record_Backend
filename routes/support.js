// routes/support.js
const express = require('express');
const router = express.Router();
const {
  createSupportRequest,
  getAllSupportRequests,
  getSupportRequest,
  updateSupportRequestStatus,
  deleteSupportRequest
} = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');

// Public route - anyone can submit a support request
router.post('/', createSupportRequest);

// Protected routes - require authentication (temporarily without role check)
router.get('/', protect, getAllSupportRequests);
router.get('/:id', protect, getSupportRequest);
router.put('/:id', protect, updateSupportRequestStatus);
router.delete('/:id', protect, deleteSupportRequest);

module.exports = router;