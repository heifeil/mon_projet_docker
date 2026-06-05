const express = require('express');
const router = express.Router();
const subnetController = require('../controllers/subnet_controller');

// Récupération des données du tableau
router.get('/data', subnetController.getSubnetData);

// Amorce du tableau (Récupération depuis le PIP et tests REST initiaux)
router.post('/amorce', subnetController.amorceSubnet);

// Scan complet et comparaison avec les équipements attendus
router.post('/scan', subnetController.scanSubnet);

module.exports = router;