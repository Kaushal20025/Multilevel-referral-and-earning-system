const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ReferralService = require('../services/ReferralService');
const { authenticateToken, generateToken } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePasswordChange
} = require('../middleware/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with optional referral
 * @access  Public
 */
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { referralCode, ...userData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { username: userData.username },
        { phone: userData.phone }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, username, or phone already exists'
      });
    }

    // Register user with referral
    const result = await ReferralService.registerUserWithReferral(userData, referralCode);

    // Generate JWT token
    const token = generateToken(result.user._id);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: {
          id: result.user._id,
          username: result.user.username,
          email: result.user.email,
          fullName: result.user.fullName,
          phone: result.user.phone,
          referralCode: result.user.referralCode,
          referralLevel: result.user.referralLevel,
          totalDirectReferrals: result.user.totalDirectReferrals,
          totalEarnings: result.user.totalEarnings
        },
        token
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          referralCode: user.referralCode,
          referralLevel: user.referralLevel,
          totalDirectReferrals: user.totalDirectReferrals,
          totalEarnings: user.totalEarnings,
          directEarnings: user.directEarnings,
          indirectEarnings: user.indirectEarnings,
          isActive: user.isActive,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          referralCode: user.referralCode,
          referralLevel: user.referralLevel,
          totalDirectReferrals: user.totalDirectReferrals,
          totalEarnings: user.totalEarnings,
          directEarnings: user.directEarnings,
          indirectEarnings: user.indirectEarnings,
          isActive: user.isActive,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  try {
    const { fullName, phone, email } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
    }

    // Check if phone is already taken by another user
    if (phone) {
      const existingUser = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already taken by another user'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          phone: updatedUser.phone,
          referralCode: updatedUser.referralCode,
          referralLevel: updatedUser.referralLevel,
          totalDirectReferrals: updatedUser.totalDirectReferrals,
          totalEarnings: updatedUser.totalEarnings,
          directEarnings: updatedUser.directEarnings,
          indirectEarnings: updatedUser.indirectEarnings,
          isActive: updatedUser.isActive,
          isVerified: updatedUser.isVerified,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

/**
 * @route   POST /api/auth/validate-referral
 * @desc    Validate referral code
 * @access  Public
 */
router.post('/validate-referral', async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }

    const result = await ReferralService.validateReferralCode(referralCode);

    res.json({
      success: result.valid,
      message: result.message,
      data: result.valid ? { referrer: result.referrer } : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router; 