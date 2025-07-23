const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductSupplier = sequelize.define('ProductSupplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  supplierSku: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  leadTimeDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Average lead time in days for this product from this supplier'
  },
  isPreferred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is the preferred supplier for this product'
  }
}, {
  tableName: 'product_suppliers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['productId', 'supplierId']
    }
  ]
});

module.exports = ProductSupplier;
