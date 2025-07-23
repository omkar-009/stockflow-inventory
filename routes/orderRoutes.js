const express = require('express');
const { check } = require('express-validator');
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  [
    check('items').isArray({ min: 1 }),
    check('items.*.productId').isInt(),
    check('items.*.quantity').isInt({ min: 1 })
  ],
  orderController.createOrder
);

router.get('/:id', orderController.getOrder);

router.patch(
  '/:id/status',
  [check('status').isIn(['processing', 'shipped', 'delivered', 'cancelled'])],
  orderController.updateOrderStatus
);

router.post(
  '/:id/returns',
  [
    check('items').isArray({ min: 1 }),
    check('reason').isString().trim().notEmpty()
  ],
  orderController.processReturn
);

module.exports = router;