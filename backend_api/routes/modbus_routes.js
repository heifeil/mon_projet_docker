const express = require('express');
const router = express.Router();
const modbusController = require('../controllers/modbus_controller');

router.get('/types', modbusController.getModbusTypes);
router.get('/points/:equipement_id', modbusController.getPointsByEquipment);
router.post('/points', modbusController.addPoint);

// Nouvelles routes
router.post('/read', modbusController.readPoint);
router.post('/write', modbusController.writePoint);

module.exports = router;