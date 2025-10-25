// controllers/supportController.js
const SupportRequest = require('../models/SupportRequest');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/support';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'support-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, and documents are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
}).array('attachments', 5); // Max 5 files

// Create support request
exports.createSupportRequest = async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const { subject, description, phoneNumber, email } = req.body;

      // Debug log
      console.log('Received data:', { subject, description, phoneNumber, email });
      console.log('Files:', req.files);

      // Validate required fields
      if (!subject || !description || !email) {
        console.log('Validation failed - missing fields');
        return res.status(400).json({
          success: false,
          message: 'Subject, description, and email are required',
          received: { subject: !!subject, description: !!description, email: !!email }
        });
      }

      // Process uploaded files
      const attachments = req.files ? req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
      })) : [];

      // Create support request
      const supportRequest = await SupportRequest.create({
        subject,
        description,
        phoneNumber: phoneNumber || '',
        email,
        attachments,
        userId: req.user ? req.user.id : null // If user is authenticated
      });

      res.status(201).json({
        success: true,
        message: 'Support request submitted successfully',
        data: supportRequest
      });

    } catch (error) {
      console.error('Error creating support request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit support request',
        error: error.message
      });
    }
  });
};

// Get all support requests (Admin only)
exports.getAllSupportRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = status ? { status } : {};
    
    const supportRequests = await SupportRequest.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await SupportRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: supportRequests,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error fetching support requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support requests',
      error: error.message
    });
  }
};

// Get single support request
exports.getSupportRequest = async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findById(req.params.id)
      .populate('userId', 'name email');

    if (!supportRequest) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: supportRequest
    });
  } catch (error) {
    console.error('Error fetching support request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support request',
      error: error.message
    });
  }
};

// Update support request status (Admin only)
exports.updateSupportRequestStatus = async (req, res) => {
  try {
    const { status, priority } = req.body;

    const supportRequest = await SupportRequest.findByIdAndUpdate(
      req.params.id,
      { status, priority },
      { new: true, runValidators: true }
    );

    if (!supportRequest) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support request updated successfully',
      data: supportRequest
    });
  } catch (error) {
    console.error('Error updating support request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update support request',
      error: error.message
    });
  }
};

// Delete support request (Admin only)
exports.deleteSupportRequest = async (req, res) => {
  try {
    const supportRequest = await SupportRequest.findById(req.params.id);

    if (!supportRequest) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    // Delete associated files
    if (supportRequest.attachments && supportRequest.attachments.length > 0) {
      supportRequest.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }

    await supportRequest.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Support request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting support request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete support request',
      error: error.message
    });
  }
};