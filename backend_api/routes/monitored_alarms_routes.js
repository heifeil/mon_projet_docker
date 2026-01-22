const express = require('express');
const router = express.Router();
const controller = require('../controllers/monitored_alarms_controller');

router.get('/', controller.getGroupedAlarms);

module.exports = router;