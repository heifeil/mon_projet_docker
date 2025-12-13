const express = require('express');
const router = express.Router();
const pipController = require('../controllers/pip_controller');

// Route pour déclencher l'import manuellement si besoin
router.post('/import', pipController.importCsvData);

// Route pour déclencher le scan Ping GLOBAL manuellement (Bouton "Scanner")
router.post('/scan', pipController.forcePing);

// Route pour déclencher le scan Ping UNITAIRE (Bouton Éclair) <--- NOUVEAU
router.post('/ping-one', pipController.pingSingleDevice);

// Route pour afficher les données
router.get('/data', pipController.getPipData);

module.exports = router;