const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  type: {
    type: String,
    enum: ['earning', 'referral', 'system', 'purchase'],
    required: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Earning specific data
  earningData: {
    amount: {
      type: Number,
      default: 0
    },
    transactionId: {
      type: String,
      default: null
    },
    referralType: {
      type: String,
      enum: ['direct', 'indirect'],
      default: null
    },
    level: {
      type: Number,
      default: null
    }
  },
  
  // Referral specific data
  referralData: {
    newReferralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    referralCode: {
      type: String,
      default: null
    }
  },
  
  // Purchase specific data
  purchaseData: {
    amount: {
      type: Number,
      default: 0
    },
    productName: {
      type: String,
      default: null
    }
  },
  
  // Notification status
  isRead: {
    type: Boolean,
    default: false
  },
  
  isDelivered: {
    type: Boolean,
    default: false
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 });

// Static methods
notificationSchema.statics.createEarningNotification = async function(userId, earningData) {
  const { amount, transactionId, referralType, level } = earningData;
  
  let title, message;
  
  if (referralType === 'direct') {
    title = 'Direct Referral Earnings!';
    message = `You earned ₹${amount.toFixed(2)} from your direct referral's purchase (Transaction: ${transactionId})`;
  } else {
    title = 'Indirect Referral Earnings!';
    message = `You earned ₹${amount.toFixed(2)} from your indirect referral's purchase (Transaction: ${transactionId})`;
  }
  
  return await this.create({
    recipient: userId,
    type: 'earning',
    title,
    message,
    earningData: {
      amount,
      transactionId,
      referralType,
      level
    },
    priority: 'high'
  });
};

notificationSchema.statics.createReferralNotification = async function(userId, referralData) {
  const { newReferralId, referralCode } = referralData;
  
  const title = 'New Referral Added!';
  const message = `Congratulations! You have a new direct referral using your code: ${referralCode}`;
  
  return await this.create({
    recipient: userId,
    type: 'referral',
    title,
    message,
    referralData: {
      newReferralId,
      referralCode
    },
    priority: 'medium'
  });
};

notificationSchema.statics.createPurchaseNotification = async function(userId, purchaseData) {
  const { amount, productName } = purchaseData;
  
  const title = 'Purchase Completed!';
  const message = `Your purchase of ${productName} for ₹${amount.toFixed(2)} has been completed successfully.`;
  
  return await this.create({
    recipient: userId,
    type: 'purchase',
    title,
    message,
    purchaseData: {
      amount,
      productName
    },
    priority: 'medium'
  });
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipient: userId,
    isRead: false
  });
};

notificationSchema.statics.markAsRead = async function(userId, notificationIds = null) {
  const query = {
    recipient: userId,
    isRead: false
  };
  
  if (notificationIds) {
    query._id = { $in: notificationIds };
  }
  
  return await this.updateMany(query, {
    isRead: true,
    updatedAt: new Date()
  });
};

notificationSchema.statics.getUserNotifications = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const notifications = await this.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('referralData.newReferralId', 'username fullName');
  
  const total = await this.countDocuments({ recipient: userId });
  
  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      hasNext: skip + limit < total,
      hasPrev: page > 1
    }
  };
};

// Instance methods
notificationSchema.methods.markAsDelivered = function() {
  this.isDelivered = true;
  return this.save();
};

// Pre-save middleware to set expiration for certain types
notificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set expiration to 30 days from creation for most notifications
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema); 