// src/routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');  // Add this
const path = require('path');      // Add this
const documentController = require('../controllers/documentController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
};  

// Create multer instance with all configurations
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Wrap multer in a custom middleware to handle errors
const uploadMiddleware = (req, res, next) => {
    upload.single('file')(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            console.error('Multer error:', err);
            return res.status(400).json({
                error: 'File upload error',
                details: err.message
            });
        } else if (err) {
            // An unknown error occurred
            console.error('Unknown upload error:', err);
            return res.status(400).json({
                error: 'File upload error',
                details: err.message
            });
        }
        // Everything went fine
        next();
    });
};  

// Use uploadMiddleware instead of upload.single('file')
router.post('/upload', auth, uploadMiddleware, documentController.uploadDocument);
router.get('/', auth, documentController.getAllDocuments);
router.get('/:id', auth, documentController.getDocument);
router.delete('/:id', auth, documentController.deleteDocument);
router.get('/:id/download', auth, documentController.downloadDocument);
router.put('/:id', auth, documentController.updateDocument);

// Approval routes
router.post('/:id/approve', auth, roleAuth(['boss']), documentController.approveDocument);
router.get('/:id/print', auth, documentController.printDocument);

module.exports = router;