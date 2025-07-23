'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add new columns to Products table
      await queryInterface.addColumn(
        'Products',
        'type',
        {
          type: Sequelize.ENUM('physical', 'digital', 'service', 'bundle'),
          allowNull: false,
          defaultValue: 'physical'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'Products',
        'lowStockThreshold',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 10,
          comment: 'Minimum quantity before low stock alert is triggered'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'Products',
        'reorderPoint',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 5,
          comment: 'Quantity at which reordering is recommended'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'Products',
        'averageDailyUsage',
        {
          type: Sequelize.FLOAT,
          allowNull: true,
          comment: 'Calculated average daily sales/usage for stockout prediction'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'Products',
        'lastSoldAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp of when this product was last sold'
        },
        { transaction }
      );

      await queryInterface.addIndex('Products', ['type'], { transaction });
      await queryInterface.addIndex('Products', ['companyId'], { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.removeIndex('Products', ['type'], { transaction });
      await queryInterface.removeIndex('Products', ['companyId'], { transaction });

      await queryInterface.removeColumn('Products', 'type', { transaction });
      await queryInterface.removeColumn('Products', 'lowStockThreshold', { transaction });
      await queryInterface.removeColumn('Products', 'reorderPoint', { transaction });
      await queryInterface.removeColumn('Products', 'averageDailyUsage', { transaction });
      await queryInterface.removeColumn('Products', 'lastSoldAt', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Products_type";', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
