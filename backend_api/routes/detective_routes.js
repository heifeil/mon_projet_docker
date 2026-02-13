const express = require('express');
const router = express.Router();
const detectiveController = require('../controllers/detective_controller');

// Route pour récupérer toutes les données du dashboard Detective
router.get('/stats', detectiveController.getDetectiveData);

module.exports = router;