const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (sequelize) => {
  class User extends Model {
    async correctPassword(candidatePassword, userPassword) {
      return await bcrypt.compare(candidatePassword, userPassword);
    }

    changedPasswordAfter(JWTTimestamp) {
      if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
      }
      return false;
    }

    createPasswordResetToken() {
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
      
      return resetToken;
    }

    createEmailVerificationToken() {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
      
      return verificationToken;
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [8, 100]
      },
      set(value) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(value, salt);
        this.setDataValue('password', hash);
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'staff'),
      defaultValue: 'staff',
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    paranoid: true,
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.email) {
          user.email = user.email.toLowerCase();
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('email') && user.email) {
          user.email = user.email.toLowerCase();
        }
        
        if (user.changed('password') && !user.isNewRecord) {
          user.passwordChangedAt = Date.now() - 1000;
        }
      }
    },
    defaultScope: {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken'] }
    },
    scopes: {
      withSensitiveData: {
        attributes: { include: ['password', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken'] }
      }
    }
  });

  return User;
};
