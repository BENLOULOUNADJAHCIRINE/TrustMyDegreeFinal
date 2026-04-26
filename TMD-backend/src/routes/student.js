

const express = require('express');
const router = express.Router();
const { dashboard, requests, downloadCertificate, downloadRequestDocument, changePassword, uploadAvatar } = require('../controllers/studentController');
const { protect, isStudent } = require('../middleware/auth');

router.get('/dashboard', protect, isStudent, dashboard);
router.post('/requests', protect, isStudent, requests);
router.get('/certificates/:id/download', protect, isStudent, downloadCertificate);
router.get("/requests/:id/download", protect, downloadRequestDocument);
router.put('/settings', protect, isStudent, changePassword);
router.post('/avatar', protect, isStudent, uploadAvatar);

module.exports = router;