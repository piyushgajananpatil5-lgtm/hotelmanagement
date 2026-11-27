const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const authController = new AuthController();

// Provides guest account registration and sign-in endpoints.
router.post('/register', authController.register);
router.post('/login', authController.login);

// Returns account details only when the request has a valid sign-in token.
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
