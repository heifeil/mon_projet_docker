const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');

// Définition des routes
// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;