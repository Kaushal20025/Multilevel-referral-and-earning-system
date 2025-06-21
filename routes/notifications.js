const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const { validateNotificationAction } = require('../middleware/validation');

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type; // Filter by notification type

    let query = { recipient: req.user._id };
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('referralData.newReferralId', 'username fullName');

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          hasNext: (page * limit) < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: {
        unreadCount: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count'
    });
  }
});

/**
 * @route   PUT /api/notifications/mark-read
 * @desc    Mark notifications as read
 * @access  Private
 */
router.put('/mark-read', authenticateToken, validateNotificationAction, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    await Notification.markAsRead(req.user._id, notificationIds);

    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark specific notification as read
 * @access  Private
 */
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

/**
 * @route   DELETE /api/notifications/clear-all
 * @desc    Clear all notifications for user
 * @access  Private
 */
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });

    res.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/earnings
 * @desc    Get earning notifications
 * @access  Private
 */
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.find({
      recipient: req.user._id,
      type: 'earning'
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments({
      recipient: req.user._id,
      type: 'earning'
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          hasNext: (page * limit) < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get earning notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/referrals
 * @desc    Get referral notifications
 * @access  Private
 */
router.get('/referrals', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.find({
      recipient: req.user._id,
      type: 'referral'
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('referralData.newReferralId', 'username fullName');

    const total = await Notification.countDocuments({
      recipient: req.user._id,
      type: 'referral'
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          hasNext: (page * limit) < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get referral notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/recent
 * @desc    Get recent notifications (last 5)
 * @access  Private
 */
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('referralData.newReferralId', 'username fullName');

    res.json({
      success: true,
      data: {
        notifications
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recent notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [
      totalNotifications,
      unreadCount,
      earningNotifications,
      referralNotifications,
      systemNotifications
    ] = await Promise.all([
      Notification.countDocuments({ recipient: req.user._id }),
      Notification.getUnreadCount(req.user._id),
      Notification.countDocuments({ recipient: req.user._id, type: 'earning' }),
      Notification.countDocuments({ recipient: req.user._id, type: 'referral' }),
      Notification.countDocuments({ recipient: req.user._id, type: 'system' })
    ]);

    res.json({
      success: true,
      data: {
        totalNotifications,
        unreadCount,
        readCount: totalNotifications - unreadCount,
        byType: {
          earning: earningNotifications,
          referral: referralNotifications,
          system: systemNotifications
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics'
    });
  }
});

module.exports = router; 