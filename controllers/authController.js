const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Company } = require('../models');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  
  user.password = undefined;
  
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user
    }
  });
};


exports.register = async (req, res, next) => {
  const { name, email, password, companyName } = req.body;

  try {
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const company = await Company.create({ name: companyName });

    const user = await User.create({
      name,
      email,
      password,
      companyId: company.id,
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    createSendToken(user, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return next(new Error('Please provide email and password', 400));
    }
    const user = await User.findOne({ 
      where: { email },
      include: [{
        model: Company,
        attributes: ['id', 'name']
      }]
    });

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Your account has been deactivated' });
    }
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Company,
        attributes: ['id', 'name']
      }]
    });

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message: 'If your email exists, you will receive a password reset link'
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new Error('There was an error sending the email. Try again later!'),
      500
    );
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return next(new Error('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return res.status(401).json({ error: 'Your current password is wrong' });
    }

    user.password = req.body.newPassword;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new Error('No refresh token provided', 401));
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
      return next(new Error('The user belonging to this token no longer exists', 401));
    }

    const token = generateToken(currentUser.id);
    
    res.status(200).json({
      status: 'success',
      token
    });
  } catch (error) {
    next(error);
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new Error('You are not logged in! Please log in to get access.', 401)
      );
    }

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
      return next(
        new Error('The user belonging to this token no longer exists.', 401)
      );
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new Error('User recently changed password! Please log in again.', 401)
      );
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};
