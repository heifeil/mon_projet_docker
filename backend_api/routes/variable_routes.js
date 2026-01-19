const express = require('express');
const router = express.Router();
const variableController = require('../controllers/variable_controller');

router.get('/types', variableController.getProtocolTypes);
router.get('/targets', variableController.getAutomataTargets);
router.get('/:id/history', variableController.getHistory);
router.get('/:id/export', variableController.exportHistory); // <--- Route Export
router.get('/', variableController.getPoints);
router.post('/', variableController.addPoint);
router.delete('/:id', variableController.deletePoint);

module.exports = router;