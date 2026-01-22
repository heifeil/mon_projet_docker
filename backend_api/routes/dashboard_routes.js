const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard_controller');

// Route pour les statistiques (Jauge, Graphes, Indicateurs)
router.get('/stats', dashboardController.getDashboardStats);

// Route pour le widget des alarmes actives uniquement
router.get('/active-alarms', dashboardController.getActiveAlarmsWidget);

module.exports = router;