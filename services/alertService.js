const { Product, Inventory, OrderItem, Order, Warehouse } = require('../models');
const { Op, literal, fn, col } = require('sequelize');

class AlertService {
    static async checkStockLevels(companyId) {
        try {
            const products = await Product.findAll({
                where: { 
                    companyId,
                    isActive: true
                },
                include: [
                    {
                        model: Inventory,
                        attributes: ['id', 'quantity', 'warehouseId']
                    }
                ]
            });

            return await Promise.all(products.map(async (product) => {
                const alerts = [];
                const totalStock = product.Inventories.reduce((sum, inv) => sum + inv.quantity, 0);
                
                // Low stock alert
                if (totalStock <= product.lowStockThreshold) {
                    alerts.push(await this.createLowStockAlert(product, totalStock));
                }

                // Stockout prediction
                const salesVelocity = await this.calculateSalesVelocity(product.id, companyId);
                if (salesVelocity > 0) {
                    const daysUntilStockout = Math.floor(totalStock / salesVelocity);
                    if (daysUntilStockout <= 7) {
                        alerts.push(await this.createStockoutAlert(product, daysUntilStockout, totalStock));
                    }
                }

                return alerts;
            }));
        } catch (error) {
            console.error('Error in checkStockLevels:', error);
            throw new Error('Failed to check stock levels');
        }
    }

    static async calculateSalesVelocity(productId, companyId) {
        try {
            const THIRTY_DAYS_AGO = new Date();
            THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

            const salesData = await OrderItem.findOne({
                attributes: [
                    [
                        fn('COALESCE', 
                            fn('AVG', 
                                fn('DATE_PART', 'day', 
                                    fn('date_trunc', 'day', col('Order.createdAt'))
                                )
                            ), 
                            0
                        ), 
                        'avgDailySales'
                    ]
                ],
                include: [
                    {
                        model: Order,
                        where: {
                            companyId,
                            status: 'completed',
                            createdAt: { [Op.gte]: THIRTY_DAYS_AGO }
                        },
                        attributes: [],
                        required: true
                    }
                ],
                where: { productId },
                raw: true
            });

            return parseFloat(salesData?.avgDailySales) || 0;
        } catch (error) {
            console.error('Error calculating sales velocity:', error);
            return 0;
        }
    }

    static async createLowStockAlert(product, currentStock) {
        try {
            return {
                type: 'LOW_STOCK',
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                currentStock,
                threshold: product.lowStockThreshold,
                message: `Low stock alert: ${product.name} (${product.sku}) is below threshold. Current: ${currentStock}, Threshold: ${product.lowStockThreshold}`,
                timestamp: new Date(),
                priority: currentStock <= product.reorderPoint ? 'HIGH' : 'MEDIUM'
            };
        } catch (error) {
            console.error('Error creating low stock alert:', error);
            throw new Error('Failed to create low stock alert');
        }
    }

    static async createStockoutAlert(product, daysUntilStockout, currentStock) {
        try {
            return {
                type: 'STOCKOUT_RISK',
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                currentStock,
                daysUntilStockout,
                message: `Stockout risk: ${product.name} (${product.sku}) may run out in ${daysUntilStockout} days. Current stock: ${currentStock}`,
                timestamp: new Date(),
                priority: daysUntilStockout <= 3 ? 'CRITICAL' : 'HIGH'
            };
        } catch (error) {
            console.error('Error creating stockout alert:', error);
            throw new Error('Failed to create stockout alert');
        }
    }

    static async checkExpiringInventory(companyId, daysThreshold = 30) {
        try {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + daysThreshold);

            const expiringItems = await Inventory.findAll({
                where: {
                    expiryDate: {
                        [Op.lte]: expirationDate,
                        [Op.gte]: new Date()
                    }
                },
                include: [
                    {
                        model: Product,
                        where: { companyId, isActive: true },
                        attributes: ['id', 'name', 'sku'],
                        required: true
                    },
                    {
                        model: Warehouse,
                        attributes: ['id', 'name'],
                        required: true
                    }
                ]
            });

            return expiringItems.map(item => ({
                type: 'EXPIRING_SOON',
                productId: item.Product.id,
                productName: item.Product.name,
                sku: item.Product.sku,
                warehouseId: item.Warehouse.id,
                warehouseName: item.Warehouse.name,
                expiryDate: item.expiryDate,
                quantity: item.quantity,
                daysUntilExpiry: Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)),
                message: `Product ${item.Product.name} (${item.quantity} units) is expiring on ${item.expiryDate.toLocaleDateString()}`,
                timestamp: new Date(),
                priority: (item.expiryDate - new Date()) <= (7 * 24 * 60 * 60 * 1000) ? 'HIGH' : 'MEDIUM'
            }));
        } catch (error) {
            console.error('Error checking expiring inventory:', error);
            throw new Error('Failed to check expiring inventory');
        }
    }
}

module.exports = AlertService;