const express = require('express');
const router = express.Router();
const alarmesController = require('../controllers/alarmes_controller');

router.get('/', alarmesController.getAlarmes);

module.exports = router;