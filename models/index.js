const sequelize = require('../config/database');
const Company = require('./Company');
const Product = require('./Product');
const Warehouse = require('./Warehouse');
const Inventory = require('./Inventory');
const Supplier = require('./Supplier');
const ProductSupplier = require('./ProductSupplier');

// Company has many Warehouses
Company.hasMany(Warehouse, { foreignKey: 'companyId' });
Warehouse.belongsTo(Company, { foreignKey: 'companyId' });

// Company has many Suppliers
Company.hasMany(Supplier, { foreignKey: 'companyId' });
Supplier.belongsTo(Company, { foreignKey: 'companyId' });

// Product has many Inventory records (one per warehouse)
Product.hasMany(Inventory, { foreignKey: 'productId' });
Inventory.belongsTo(Product, { foreignKey: 'productId' });

// Warehouse has many Inventory records (one per product)
Warehouse.hasMany(Inventory, { foreignKey: 'warehouseId' });
Inventory.belongsTo(Warehouse, { foreignKey: 'warehouseId' });

// Product and Supplier many-to-many relationship
Product.belongsToMany(Supplier, { 
  through: ProductSupplier,
  foreignKey: 'productId',
  otherKey: 'supplierId'
});

Supplier.belongsToMany(Product, {
  through: ProductSupplier,
  foreignKey: 'supplierId',
  otherKey: 'productId'
});

// Add a method to Product to get available quantity across all warehouses
Product.prototype.getTotalQuantity = async function() {
  const inventory = await Inventory.sum('quantity', {
    where: { productId: this.id }
  });
  return inventory || 0;
};

// Add a method to check if a product is below its low stock threshold
Product.prototype.isLowStock = async function(warehouseId = null) {
  const whereClause = { productId: this.id };
  if (warehouseId) {
    whereClause.warehouseId = warehouseId;
  }
  
  const inventory = await Inventory.sum('quantity', { where: whereClause });
  return (inventory || 0) < this.lowStockThreshold;
};

// Add a method to get inventory by warehouse
Product.prototype.getInventoryByWarehouse = async function() {
  return await Inventory.findAll({
    where: { productId: this.id },
    include: [
      { model: Warehouse, attributes: ['id', 'name', 'code'] }
    ],
    attributes: ['id', 'quantity', 'reservedQuantity']
  });
};

module.exports = {
  sequelize,
  Company,
  Product,
  Warehouse,
  Inventory,
  Supplier,
  ProductSupplier
};
