const express = require('express');
const router = express.Router();
const ReferralService = require('../services/ReferralService');
const { authenticateToken } = require('../middleware/auth');
const {
  validatePurchase,
  validateUserId,
  validateDateRange
} = require('../middleware/validation');

/**
 * @route   GET /api/referral/tree
 * @desc    Get user's referral tree
 * @access  Private
 */
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const depth = parseInt(req.query.depth) || 2;
    const result = await ReferralService.getReferralTree(req.user._id, depth);

    res.json({
      success: true,
      message: result.message,
      data: result.tree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/referral/stats
 * @desc    Get user's referral statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await ReferralService.getUserReferralStats(req.user._id);

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/referral/earnings
 * @desc    Get user's earnings report
 * @access  Private
 */
router.get('/earnings', authenticateToken, validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await ReferralService.getUserEarningsReport(
      req.user._id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/referral/purchase
 * @desc    Process a purchase and calculate earnings
 * @access  Private
 */
router.post('/purchase', authenticateToken, validatePurchase, async (req, res) => {
  try {
    const purchaseData = {
      ...req.body,
      userId: req.body.userId || req.user._id
    };

    const result = await ReferralService.processPurchase(purchaseData);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        transactionId: result.earning.transactionId,
        purchaseAmount: result.earning.purchaseAmount,
        profitAmount: result.earning.profitAmount,
        isValidForEarnings: result.earning.isValidForEarnings,
        totalEarningsDistributed: result.earning.totalEarningsDistributed,
        referralChain: result.earning.referralChain,
        status: result.earning.status
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
 * @route   GET /api/referral/analytics
 * @desc    Get system analytics (admin only)
 * @access  Private
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const result = await ReferralService.getSystemAnalytics();

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/referral/user/:userId/tree
 * @desc    Get specific user's referral tree (admin only)
 * @access  Private
 */
router.get('/user/:userId/tree', authenticateToken, validateUserId, async (req, res) => {
  try {
    const depth = parseInt(req.query.depth) || 2;
    const result = await ReferralService.getReferralTree(req.params.userId, depth);

    res.json({
      success: true,
      message: result.message,
      data: result.tree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/referral/user/:userId/earnings
 * @desc    Get specific user's earnings report (admin only)
 * @access  Private
 */
router.get('/user/:userId/earnings', authenticateToken, validateUserId, validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await ReferralService.getUserEarningsReport(
      req.params.userId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/referral/user/:userId/stats
 * @desc    Get specific user's referral statistics (admin only)
 * @access  Private
 */
router.get('/user/:userId/stats', authenticateToken, validateUserId, async (req, res) => {
  try {
    const result = await ReferralService.getUserReferralStats(req.params.userId);

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/referral/leaderboard
 * @desc    Get top earners leaderboard
 * @access  Public
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const User = require('../models/User');

    const topEarners = await User.find({ isActive: true })
      .sort({ totalEarnings: -1 })
      .limit(limit)
      .select('username fullName totalEarnings directEarnings indirectEarnings totalDirectReferrals');

    res.json({
      success: true,
      data: {
        leaderboard: topEarners,
        total: topEarners.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard'
    });
  }
});

/**
 * @route   GET /api/referral/system-stats
 * @desc    Get system statistics
 * @access  Public
 */
router.get('/system-stats', async (req, res) => {
  try {
    const User = require('../models/User');
    const Earning = require('../models/Earning');

    const [
      totalUsers,
      activeUsers,
      totalEarnings,
      totalTransactions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Earning.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalEarningsDistributed' } } }
      ]),
      Earning.countDocuments({ status: 'completed' })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalEarningsDistributed: totalEarnings[0]?.total || 0,
        totalTransactions,
        averageEarningsPerUser: totalUsers > 0 ? (totalEarnings[0]?.total || 0) / totalUsers : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get system statistics'
    });
  }
});

module.exports = router; 