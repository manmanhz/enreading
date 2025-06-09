const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');

class AuthController {
  // 用户注册
  static async register(req, res) {
    try {
      // 验证输入数据
      const schema = Joi.object({
        username: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { username, email, password } = value;

      // 检查用户是否已存在
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '邮箱已被注册'
        });
      }

      // 检查用户名是否已存在
      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: '用户名已被使用'
        });
      }

      // 创建用户
      const userId = await User.create({
        username,
        email,
        password
      });

      // 生成JWT token
      const token = jwt.sign(
        { id: userId, email },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          token,
          user: {
            id: userId,
            username,
            email
          }
        }
      });

    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 用户登录
  static async login(req, res) {
    try {
      // 验证输入数据
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { email, password } = value;

      // 查找用户
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误'
        });
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误'
        });
      }

      // 更新最后登录时间
      await User.updateLastLoginTime(user.id);

      // 生成JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            created_at: user.created_at
          }
        }
      });

    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取当前用户信息
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 获取用户统计数据
      const stats = await User.getStats(userId);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            created_at: user.created_at,
            last_login_at: user.last_login_at
          },
          stats
        }
      });

    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户信息
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      
      // 验证输入数据
      const schema = Joi.object({
        username: Joi.string().min(3).max(30),
        avatar_url: Joi.string().uri().allow('')
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      // 如果更新用户名，检查是否已存在
      if (value.username) {
        const existingUser = await User.findByUsername(value.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({
            success: false,
            message: '用户名已被使用'
          });
        }
      }

      // 更新用户信息
      const success = await User.update(userId, value);
      if (!success) {
        return res.status(400).json({
          success: false,
          message: '更新失败'
        });
      }

      // 获取更新后的用户信息
      const updatedUser = await User.findById(userId);

      res.json({
        success: true,
        message: '更新成功',
        data: {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            avatar_url: updatedUser.avatar_url
          }
        }
      });

    } catch (error) {
      console.error('更新用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 修改密码
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      
      // 验证输入数据
      const schema = Joi.object({
        current_password: Joi.string().required(),
        new_password: Joi.string().min(6).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { current_password, new_password } = value;

      // 获取用户当前信息
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证当前密码
      const isValidPassword = await bcrypt.compare(current_password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '当前密码错误'
        });
      }

      // 更新密码
      const success = await User.updatePassword(userId, new_password);
      if (!success) {
        return res.status(400).json({
          success: false,
          message: '密码更新失败'
        });
      }

      res.json({
        success: true,
        message: '密码修改成功'
      });

    } catch (error) {
      console.error('修改密码错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 刷新token
  static async refreshToken(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 生成新的JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: { token }
      });

    } catch (error) {
      console.error('刷新token错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除账户
  static async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      // ... existing code ...
    } catch (error) {
      console.error('删除账户错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = AuthController; 