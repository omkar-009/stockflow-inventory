const { Product, Inventory, Warehouse, Supplier, ProductSupplier } = require('../models');
const { Op, literal } = require('sequelize');

exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    
    const lowStockProducts = await Product.findAll({
      where: { companyId },
      include: [
        {
          model: Inventory,
          include: [
            {
              model: Warehouse,
              where: { companyId },
              attributes: ['id', 'name']
            }
          ],
          where: {
            quantity: {
              [Op.lte]: literal('"Product"."lowStockThreshold"')
            }
          },
          required: true
        },
        {
          model: ProductSupplier,
          include: [
            {
              model: Supplier,
              attributes: ['id', 'name', 'contactEmail']
            }
          ],
          required: false
        }
      ],
      having: literal(`
        EXISTS (
          SELECT 1 FROM "OrderItems" oi
          JOIN "Orders" o ON oi."orderId" = o.id
          WHERE oi."productId" = "Product".id
          AND o."createdAt" > NOW() - INTERVAL '30 days'
          AND o."companyId" = ${companyId}
        )
      `)
    });

    const alerts = [];
    
    lowStockProducts.forEach(product => {
      product.Inventories.forEach(inventory => {
        const supplier = product.ProductSuppliers[0]?.Supplier;
        
        alerts.push({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          warehouse_id: inventory.Warehouse.id,
          warehouse_name: inventory.Warehouse.name,
          current_stock: inventory.quantity,
          threshold: product.lowStockThreshold,
          days_until_stockout: calculateDaysUntilStockout(product, inventory.quantity),
          supplier: supplier ? {
            id: supplier.id,
            name: supplier.name,
            contact_email: supplier.contactEmail
          } : null
        });
      });
    });

    res.json({
      alerts,
      total_alerts: alerts.length
    });

  } catch (error) {
    console.error('Error getting low stock alerts:', error);
    next(error);
  }
};

function calculateDaysUntilStockout(product, currentStock) {
  const averageDailyUsage = product.averageDailyUsage || 1;
  return Math.floor(currentStock / averageDailyUsage);
}
