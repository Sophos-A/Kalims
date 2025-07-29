// src/routes/triageRoutes.js
const express = require('express');
const router = express.Router();
const triageController = require('../controllers/triageController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/process', authenticate, authorize(['staff', 'admin']), triageController.processTriage);
router.put('/:visitId/priority', authenticate, authorize(['doctor', 'admin']), triageController.markAsPriority);

module.exports = router;