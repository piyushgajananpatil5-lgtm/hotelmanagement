const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
