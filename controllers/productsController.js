const { validationResult } = require('express-validator');
const { Product, Inventory, Warehouse, sequelize } = require('../models');
const { Op } = require('sequelize');

const createProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, sku, price, description, category, type, lowStockThreshold, initialQuantity, warehouseId } = req.body;

    const existingProduct = await Product.findOne({ 
      where: { sku },
      transaction
    });

    if (existingProduct) {
      await transaction.rollback();
      return res.status(400).json({ error: 'SKU already exists' });
    }

    if (initialQuantity > 0 && warehouseId) {
      const warehouse = await Warehouse.findByPk(warehouseId, { transaction });
      if (!warehouse) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Warehouse not found' });
      }
    }

    const product = await Product.create({
      name,
      sku,
      price,
      description,
      category,
      type: type || 'simple',
      lowStockThreshold: lowStockThreshold || 10
    }, { transaction });

    if (initialQuantity > 0 && warehouseId) {
      await Inventory.create({
        productId: product.id,
        warehouseId,
        quantity: initialQuantity,
        reservedQuantity: 0,
        lastStockUpdate: new Date()
      }, { transaction });
    }

    await transaction.commit();
    
    const createdProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: Inventory,
          include: [Warehouse]
        }
      ]
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, lowStock } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Inventory,
          include: [Warehouse]
        }
      ]
    });
    
    let filteredProducts = products;
    if (lowStock === 'true') {
      filteredProducts = await Promise.all(
        products.map(async (product) => {
          const isLow = await product.isLowStock();
          return isLow ? product : null;
        })
      );
      filteredProducts = filteredProducts.filter(product => product !== null);
    }
    
    res.json({
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      products: filteredProducts
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id, {
      include: [
        {
          model: Inventory,
          include: [Warehouse]
        },
        {
          model: Supplier,
          through: { attributes: ['supplierSku', 'cost', 'leadTimeDays', 'isPreferred'] }
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const updateProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { name, sku, price, description, category, type, lowStockThreshold } = req.body;
    
    const product = await Product.findByPk(id, { transaction });
    
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ 
        where: { sku },
        transaction
      });
      
      if (existingProduct) {
        await transaction.rollback();
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }
    
    await product.update({
      name: name || product.name,
      sku: sku || product.sku,
      price: price !== undefined ? price : product.price,
      description: description !== undefined ? description : product.description,
      category: category !== undefined ? category : product.category,
      type: type || product.type,
      lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : product.lowStockThreshold
    }, { transaction });
    
    await transaction.commit();
    
    const updatedProduct = await Product.findByPk(id, {
      include: [
        {
          model: Inventory,
          include: [Warehouse]
        }
      ]
    });
    
    res.json(updatedProduct);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id, { transaction });
    
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const inventoryCount = await Inventory.count({
      where: { productId: id },
      transaction
    });
    
    if (inventoryCount > 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Cannot delete product with existing inventory. Remove inventory first.' 
      });
    }
    
    await product.destroy({ transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};