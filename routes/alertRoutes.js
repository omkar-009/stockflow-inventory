const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const alertController = require('../controllers/alertController');

// Get low stock alerts for a company
router.get('/companies/:companyId/alerts/low-stock', 
  authenticate,
  alertController.getLowStockAlerts
);

module.exports = router;
