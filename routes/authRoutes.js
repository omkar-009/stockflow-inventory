const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('companyName', 'Company name is required').not().isEmpty()
  ],
  asyncHandler(authController.register)
);

router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  asyncHandler(authController.login)
);

router.get(
  '/me',
  authController.protect,
  asyncHandler(authController.getMe)
);

router.post(
  '/refresh-token',
  asyncHandler(authController.refreshToken)
);

router.post(
  '/forgot-password',
  [check('email', 'Please include a valid email').isEmail()],
  asyncHandler(authController.forgotPassword)
);

router.put(
  '/reset-password/:token',
  [
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('confirmPassword', 'Passwords do not match').custom((value, { req }) => 
      value === req.body.password
    )
  ],
  asyncHandler(authController.resetPassword)
);

router.put(
  '/update-password',
  authController.protect,
  [
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  asyncHandler(authController.updatePassword)
);

module.exports = router;
