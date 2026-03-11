const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleMiddleware');

const {
  createRequest,
  getRequests,
  getDrafts,
  getRejected,
  updateDraft,
  replyClarification
} = require('../controllers/employeeController');

const { raiseException } = require('../controllers/exceptionController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/requests',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  upload.single('document'),
  createRequest
);

router.get('/requests',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  getRequests
);

router.get('/requests/drafts',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  getDrafts
);

router.get('/requests/rejected',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  getRejected
);

router.put('/requests/:id',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  updateDraft
);

router.post('/requests/:id/exception',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  raiseException
);

router.post('/requests/:id/clarification-reply',
  authMiddleware,
  allowRoles('EMPLOYEE'),
  replyClarification
);

module.exports = router;