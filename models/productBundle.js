module.exports = (sequelize, DataTypes) => {
    const ProductBundle = sequelize.define('ProductBundle', {
      name: DataTypes.STRING,
      sku: { type: DataTypes.STRING, unique: true },
      price: DataTypes.DECIMAL(10, 2),
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    });
  
    ProductBundle.associate = (models) => {
      ProductBundle.belongsTo(models.Company);
      ProductBundle.hasMany(models.BundleItem);
    };
  
    return ProductBundle;
  };
  
  module.exports = (sequelize, DataTypes) => ({
    bundleId: DataTypes.INTEGER,
    productId: DataTypes.INTEGER,
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 }
  });

  class BundleService {
    static async processBundleSale(bundleId, quantity, warehouseId) {
      const bundle = await ProductBundle.findByPk(bundleId, {
        include: [BundleItem]
      });
  
      for (const item of bundle.BundleItems) {
        const inventory = await Inventory.findOne({
          where: { productId: item.productId, warehouseId }
        });
  
        if (inventory.quantity < (item.quantity * quantity)) {
          throw new Error(`Insufficient stock for product ${item.productId} in bundle`);
        }
      }
  
      for (const item of bundle.BundleItems) {
        await Inventory.decrement('quantity', {
          by: item.quantity * quantity,
          where: { productId: item.productId, warehouseId }
        });
      }
  
      return true;
    }
  }