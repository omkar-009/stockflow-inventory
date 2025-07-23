module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define('Order', {
      orderNumber: { type: DataTypes.STRING, unique: true },
      customerId: DataTypes.INTEGER,
      status: { 
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending'
      },
      totalAmount: DataTypes.DECIMAL(10, 2),
      paymentStatus: DataTypes.ENUM('pending', 'paid', 'refunded', 'failed')
    });
  
    Order.associate = (models) => {
      Order.belongsTo(models.Company);
      Order.hasMany(models.OrderItem);
      Order.belongsTo(models.Customer);
      Order.hasMany(models.Transaction);
    };
  
    return Order;
  };
  
  module.exports = (sequelize, DataTypes) => ({
    orderId: DataTypes.INTEGER,
    productId: DataTypes.INTEGER,
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 }
  });