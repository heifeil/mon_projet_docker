const express = require('express');
const router = express.Router();
const pipController = require('../controllers/pip_controller');

// Route pour déclencher l'import manuellement si besoin
router.post('/import', pipController.importCsvData);

// Route pour déclencher le scan Ping GLOBAL manuellement
router.post('/scan', pipController.forcePing);

// Route pour déclencher le scan Ping UNITAIRE
router.post('/ping-one', pipController.pingSingleDevice);

// Route pour exporter le CSV (Téléchargement + Mise à jour fichier)
router.get('/export', pipController.exportPipData);

// Route pour afficher les données
router.get('/data', pipController.getPipData);

module.exports = router;