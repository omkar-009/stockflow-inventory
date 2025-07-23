const { validationResult } = require('express-validator');
const { Inventory, Product, Warehouse, sequelize, ProductSupplier } = require('../models');
const { Op } = require('sequelize');

const getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const inventory = await Inventory.findAll({
      where: { productId },
      include: [
        { 
          model: Warehouse,
          attributes: ['id', 'name', 'code', 'address']
        }
      ]
    });
    
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching product inventory:', error);
    res.status(500).json({ error: 'Failed to fetch product inventory' });
  }
};

const updateInventory = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { inventoryId } = req.params;
    const { quantity, reservedQuantity, reorderPoint } = req.body;
    
    const inventory = await Inventory.findByPk(inventoryId, { transaction });
    
    if (!inventory) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Inventory record not found' });
    }
    
    if (quantity !== undefined && quantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }
    
    if (reservedQuantity !== undefined && reservedQuantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Reserved quantity cannot be negative' });
    }
    
    await inventory.update({
      quantity: quantity !== undefined ? quantity : inventory.quantity,
      reservedQuantity: reservedQuantity !== undefined ? reservedQuantity : inventory.reservedQuantity,
      reorderPoint: reorderPoint !== undefined ? reorderPoint : inventory.reorderPoint,
      lastStockUpdate: new Date()
    }, { transaction });
    
    await transaction.commit();
    
    const updatedInventory = await Inventory.findByPk(inventoryId, {
      include: [
        { model: Product },
        { model: Warehouse }
      ]
    });
    
    res.json(updatedInventory);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
};

const addStock = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { productId, warehouseId, quantity, notes } = req.body;
    
    if (!productId || !warehouseId || quantity === undefined) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'productId, warehouseId, and quantity are required' 
      });
    }
    
    if (quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Quantity must be greater than 0' 
      });
    }
    
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const warehouse = await Warehouse.findByPk(warehouseId, { transaction });
    if (!warehouse) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    let [inventory] = await Inventory.findOrCreate({
      where: { productId, warehouseId },
      defaults: {
        quantity: 0,
        reservedQuantity: 0
      },
      transaction
    });
    
    const newQuantity = inventory.quantity + quantity;
    await inventory.update({
      quantity: newQuantity,
      lastStockUpdate: new Date()
    }, { transaction });
    
    await transaction.commit();
    
    const updatedInventory = await Inventory.findByPk(inventory.id, {
      include: [
        { model: Product },
        { model: Warehouse }
      ]
    });
    
    res.status(201).json(updatedInventory);
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
};

const removeStock = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { productId, warehouseId, quantity, notes } = req.body;
    
    if (!productId || !warehouseId || quantity === undefined) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'productId, warehouseId, and quantity are required' 
      });
    }
    
    if (quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Quantity must be greater than 0' 
      });
    }
    
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const warehouse = await Warehouse.findByPk(warehouseId, { transaction });
    if (!warehouse) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    const inventory = await Inventory.findOne({
      where: { productId, warehouseId },
      transaction
    });
    
    if (!inventory || inventory.quantity < quantity) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Insufficient stock available' 
      });
    }
    
    const newQuantity = inventory.quantity - quantity;
    await inventory.update({
      quantity: newQuantity,
      lastStockUpdate: new Date()
    }, { transaction });
    
    await transaction.commit();
    
    const updatedInventory = await Inventory.findByPk(inventory.id, {
      include: [
        { model: Product },
        { model: Warehouse }
      ]
    });
    
    res.status(200).json(updatedInventory);
  } catch (error) {
    await transaction.rollback();
    console.error('Error removing stock:', error);
    res.status(500).json({ error: 'Failed to remove stock' });
  }
};

const getLowStockAlerts = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const warehouses = await Warehouse.findAll({
      where: { companyId },
      attributes: ['id', 'name']
    });
    
    if (warehouses.length === 0) {
      return res.json({
        alerts: [],
        total_alerts: 0
      });
    }
    
    const warehouseIds = warehouses.map(w => w.id);
    
    const inventoryItems = await Inventory.findAll({
      where: {
        warehouseId: { [Op.in]: warehouseIds },
        quantity: { [Op.gt]: 0 }
      },
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'sku', 'lowStockThreshold'],
          where: {
            isActive: true
          },
          include: [
            {
              model: ProductSupplier,
              include: [
                {
                  model: Supplier,
                  attributes: ['id', 'name', 'email']
                }
              ]
            }
          ]
        },
        {
          model: Warehouse,
          attributes: ['id', 'name', 'code']
        }
      ]
    });
    
    const alerts = inventoryItems
      .filter(item => {
        const threshold = item.Product.lowStockThreshold || 5;
        return item.quantity <= threshold;
      })
      .map(item => ({
        productId: item.Product.id,
        productName: item.Product.name,
        sku: item.Product.sku,
        warehouseId: item.Warehouse.id,
        warehouseName: item.Warehouse.name,
        currentStock: item.quantity,
        lowStockThreshold: item.Product.lowStockThreshold || 5,
        supplier: item.Product.ProductSuppliers[0]?.Supplier || null
      }));
    
    res.json({
      alerts,
      total_alerts: alerts.length
    });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ error: 'Failed to fetch low stock alerts' });
  }
};

module.exports = {
  getProductInventory,
  updateInventory,
  addStock,
  removeStock,
  getLowStockAlerts
};