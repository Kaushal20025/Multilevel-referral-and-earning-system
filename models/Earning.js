const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  // Transaction details
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  purchaseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  profitAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // User who made the purchase
  purchaser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Referral chain for this transaction
  referralChain: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 2
    },
    earningPercentage: {
      type: Number,
      required: true
    },
    earningAmount: {
      type: Number,
      required: true,
      min: 0
    },
    isDirect: {
      type: Boolean,
      required: true
    }
  }],
  
  // Total earnings distributed
  totalEarningsDistributed: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Transaction status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Purchase validation
  isValidForEarnings: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Additional metadata
  purchaseDetails: {
    productName: String,
    category: String,
    purchaseDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Processing information
  processedAt: {
    type: Date,
    default: null
  },
  
  // Error tracking
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
earningSchema.index({ transactionId: 1 });
earningSchema.index({ purchaser: 1 });
earningSchema.index({ 'referralChain.userId': 1 });
earningSchema.index({ status: 1 });
earningSchema.index({ createdAt: -1 });
earningSchema.index({ purchaseAmount: 1 });

// Static methods
earningSchema.statics.generateTransactionId = function() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
};

earningSchema.statics.getUserEarnings = async function(userId, startDate, endDate) {
  const query = {
    'referralChain.userId': userId
  };
  
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  const earnings = await this.find(query);
  
  const summary = {
    totalEarnings: 0,
    directEarnings: 0,
    indirectEarnings: 0,
    totalTransactions: 0,
    directTransactions: 0,
    indirectTransactions: 0,
    breakdown: []
  };
  
  earnings.forEach(earning => {
    const userEarning = earning.referralChain.find(chain => 
      chain.userId.toString() === userId.toString()
    );
    
    if (userEarning) {
      summary.totalEarnings += userEarning.earningAmount;
      summary.totalTransactions += 1;
      
      if (userEarning.isDirect) {
        summary.directEarnings += userEarning.earningAmount;
        summary.directTransactions += 1;
      } else {
        summary.indirectEarnings += userEarning.earningAmount;
        summary.indirectTransactions += 1;
      }
      
      summary.breakdown.push({
        transactionId: earning.transactionId,
        purchaseAmount: earning.purchaseAmount,
        profitAmount: earning.profitAmount,
        earningAmount: userEarning.earningAmount,
        earningPercentage: userEarning.earningPercentage,
        isDirect: userEarning.isDirect,
        level: userEarning.level,
        purchaser: earning.purchaser,
        date: earning.createdAt
      });
    }
  });
  
  return summary;
};

earningSchema.statics.getReferralEarnings = async function(userId) {
  // Get all earnings where user is in referral chain
  const earnings = await this.find({
    'referralChain.userId': userId,
    status: 'completed'
  }).populate('purchaser', 'username email fullName');
  
  const referralStats = {
    totalEarnings: 0,
    directReferrals: new Map(),
    indirectReferrals: new Map(),
    monthlyBreakdown: new Map()
  };
  
  earnings.forEach(earning => {
    const userEarning = earning.referralChain.find(chain => 
      chain.userId.toString() === userId.toString()
    );
    
    if (userEarning) {
      referralStats.totalEarnings += userEarning.earningAmount;
      
      const purchaserId = earning.purchaser._id.toString();
      const month = earning.createdAt.toISOString().substring(0, 7); // YYYY-MM
      
      // Track by referral type
      if (userEarning.isDirect) {
        if (!referralStats.directReferrals.has(purchaserId)) {
          referralStats.directReferrals.set(purchaserId, {
            user: earning.purchaser,
            totalEarnings: 0,
            transactions: 0
          });
        }
        const directRef = referralStats.directReferrals.get(purchaserId);
        directRef.totalEarnings += userEarning.earningAmount;
        directRef.transactions += 1;
      } else {
        if (!referralStats.indirectReferrals.has(purchaserId)) {
          referralStats.indirectReferrals.set(purchaserId, {
            user: earning.purchaser,
            totalEarnings: 0,
            transactions: 0
          });
        }
        const indirectRef = referralStats.indirectReferrals.get(purchaserId);
        indirectRef.totalEarnings += userEarning.earningAmount;
        indirectRef.transactions += 1;
      }
      
      // Monthly breakdown
      if (!referralStats.monthlyBreakdown.has(month)) {
        referralStats.monthlyBreakdown.set(month, {
          totalEarnings: 0,
          directEarnings: 0,
          indirectEarnings: 0,
          transactions: 0
        });
      }
      const monthly = referralStats.monthlyBreakdown.get(month);
      monthly.totalEarnings += userEarning.earningAmount;
      monthly.transactions += 1;
      
      if (userEarning.isDirect) {
        monthly.directEarnings += userEarning.earningAmount;
      } else {
        monthly.indirectEarnings += userEarning.earningAmount;
      }
    }
  });
  
  return referralStats;
};

// Instance methods
earningSchema.methods.calculateReferralEarnings = async function() {
  const minPurchaseAmount = process.env.MIN_PURCHASE_AMOUNT || 1000;
  const directPercentage = process.env.DIRECT_EARNING_PERCENTAGE || 5;
  const indirectPercentage = process.env.INDIRECT_EARNING_PERCENTAGE || 1;
  
  this.isValidForEarnings = this.purchaseAmount >= minPurchaseAmount;
  
  if (!this.isValidForEarnings) {
    this.referralChain = [];
    this.totalEarningsDistributed = 0;
    return;
  }
  
  // Calculate earnings for each level
  this.referralChain = [];
  this.totalEarningsDistributed = 0;
  
  // Level 1 (Direct) - 5%
  if (this.purchaser.referredBy) {
    const directEarning = (this.profitAmount * directPercentage) / 100;
    this.referralChain.push({
      userId: this.purchaser.referredBy,
      level: 1,
      earningPercentage: directPercentage,
      earningAmount: directEarning,
      isDirect: true
    });
    this.totalEarningsDistributed += directEarning;
    
    // Level 2 (Indirect) - 1%
    const directReferrer = await mongoose.model('User').findById(this.purchaser.referredBy);
    if (directReferrer && directReferrer.referredBy) {
      const indirectEarning = (this.profitAmount * indirectPercentage) / 100;
      this.referralChain.push({
        userId: directReferrer.referredBy,
        level: 2,
        earningPercentage: indirectPercentage,
        earningAmount: indirectEarning,
        isDirect: false
      });
      this.totalEarningsDistributed += indirectEarning;
    }
  }
};

module.exports = mongoose.model('Earning', earningSchema); 