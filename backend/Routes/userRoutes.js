// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.js');
const { authenticate, isAdmin } = require('../middlewares/auth.js');

/**
 * @route   POST /api/users/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', userController.register);

/**
 * @route   POST /api/users/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', userController.login);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private (requires authentication)
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private (requires authentication)
 */
router.put('/profile', authenticate, userController.updateProfile);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private (requires authentication)
 */
router.delete('/account', authenticate, userController.deleteAccount);

/**
 * @route   GET /api/users/all
 * @desc    Get all users
 * @access  Private (admin only)
 */
router.get('/all', authenticate, isAdmin, userController.getAllUsers);

module.exports = router;