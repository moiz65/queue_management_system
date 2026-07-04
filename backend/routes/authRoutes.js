const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.post('/login', AuthController.login);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, AuthController.updateProfile);
router.put('/settings', authenticate, AuthController.updateSettings);
router.get('/settings', authenticate, AuthController.getSettings);
// Super admin only routes
router.get('/admins', authenticate, authorize('super_admin'), AuthController.getAllAdmins);
router.post('/admins', authenticate, authorize('super_admin'), AuthController.createAdmin);

module.exports = router;