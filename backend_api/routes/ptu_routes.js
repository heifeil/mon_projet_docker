const express = require('express');
const router = express.Router();
const ptuController = require('../controllers/ptu_controller');

// GET /api/ptu
router.get('/', ptuController.getTests);

// POST /api/ptu/write
router.post('/write', ptuController.writePoint);

// POST /api/ptu/history
router.post('/history', ptuController.saveHistory);

module.exports = router;