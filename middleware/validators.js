const { check, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Product, Company } = require('../models');

const commonValidators = {
    companyId: check('companyId')
        .isInt({ min: 1 })
        .withMessage('Company ID must be a positive integer')
        .custom(async (value) => {
            const company = await Company.findByPk(value);
            if (!company) {
                throw new Error('Company not found');
            }
            return true;
        }),
    
    productId: check('productId')
        .isInt({ min: 1 })
        .withMessage('Product ID must be a positive integer')
        .custom(async (value) => {
            const product = await Product.findByPk(value);
            if (!product) {
                throw new Error('Product not found');
            }
            return true;
        }),

    sku: check('sku')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('SKU must be between 3 and 50 characters')
        .custom(async (value, { req }) => {
            const product = await Product.findOne({ 
                where: { 
                    sku: value,
                    ...(req.params.id && { id: { [Op.ne]: req.params.id } })
                } 
            });
            if (product) {
                throw new Error('SKU already exists');
            }
            return true;
        }),

    quantity: check('quantity')
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),

    price: check('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a non-negative number'),

    email: check('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
};

const validators = {
    createProduct: [
        commonValidators.companyId,
        check('name')
            .trim()
            .isLength({ min: 2, max: 255 })
            .withMessage('Name must be between 2 and 255 characters'),
        commonValidators.sku,
        commonValidators.price,
        check('lowStockThreshold')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Low stock threshold must be a non-negative integer'),
        check('reorderPoint')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Reorder point must be a non-negative integer'),
    ],

    updateProduct: [
        commonValidators.productId,
        check('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 255 })
            .withMessage('Name must be between 2 and 255 characters'),
        commonValidators.sku.optional(),
        check('price')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Price must be a non-negative number'),
    ],

    createOrder: [
        commonValidators.companyId,
        check('customerId')
            .isInt({ min: 1 })
            .withMessage('Customer ID must be a positive integer'),
        check('items')
            .isArray({ min: 1 })
            .withMessage('Order must contain at least one item'),
        check('items.*.productId')
            .isInt({ min: 1 })
            .withMessage('Product ID must be a positive integer'),
        check('items.*.quantity')
            .isInt({ min: 1 })
            .withMessage('Quantity must be at least 1'),
        check('items.*.unitPrice')
            .isFloat({ min: 0 })
            .withMessage('Unit price must be a non-negative number'),
    ],

    getLowStockAlerts: [
        check('threshold')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Threshold must be a non-negative integer'),
        check('warehouseId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Warehouse ID must be a positive integer'),
    ],

    updateInventory: [
        commonValidators.productId,
        check('warehouseId')
            .isInt({ min: 1 })
            .withMessage('Warehouse ID must be a positive integer'),
        commonValidators.quantity,
    ],
};

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));
    
    return res.status(422).json({
        success: false,
        errors: extractedErrors,
    });
};

module.exports = {
    validators,
    validate,
    commonValidators
};
