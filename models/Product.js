const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('physical', 'digital', 'service', 'bundle'),
    allowNull: false,
    defaultValue: 'physical'
  },
  lowStockThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    comment: 'Minimum quantity before low stock alert is triggered'
  },
  reorderPoint: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: 'Quantity at which reordering is recommended'
  },
  averageDailyUsage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Calculated average daily sales/usage for stockout prediction'
  },
  lastSoldAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of when this product was last sold'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Companies',
      key: 'id'
    }
  }
}, {
  tableName: 'Products',
  timestamps: true,
  indexes: [
    {
      fields: ['sku'],
      unique: true
    },
    {
      fields: ['companyId']
    },
    {
      fields: ['type']
    }
  ]
});

module.exports = Product;
