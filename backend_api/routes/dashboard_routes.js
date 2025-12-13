const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard_controller');

router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;