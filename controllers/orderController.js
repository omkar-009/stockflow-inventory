const { Order, OrderItem, Inventory, Product } = require('../models');
const { sequelize } = require('../config/database');
const AlertService = require('../services/alertService');

exports.createOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { items, customerId } = req.body;
    const order = await Order.create({
      customerId,
      companyId: req.user.companyId,
      status: 'pending',
      totalAmount: 0
    }, { transaction });

    let total = 0;
    for (const item of items) {
      const inventory = await Inventory.findOne({
        where: { 
          productId: item.productId,
          warehouseId: item.warehouseId 
        },
        transaction
      });

      if (!inventory || inventory.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }

      inventory.quantity -= item.quantity;
      await inventory.save({ transaction });

      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }, { transaction });

      total += item.quantity * item.unitPrice;
    }

    order.totalAmount = total;
    await order.save({ transaction });

    await transaction.commit();
    try {
      const alerts = await Promise.all(await AlertService.checkStockLevels(req.user.companyId));
      const flattenedAlerts = alerts.flat();
      
      if (flattenedAlerts.length > 0) {
        console.log('Stock alerts generated:', flattenedAlerts);
      }
    } catch (alertError) {
      console.error('Error checking stock levels:', alertError);
    }

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};