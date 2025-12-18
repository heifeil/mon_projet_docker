const express = require('express');
const router = express.Router();
const detectiveController = require('../controllers/detective_controller');

router.get('/stats', detectiveController.getDetectiveData);

module.exports = router;