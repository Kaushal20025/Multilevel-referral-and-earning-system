const User = require('../models/User');
const Earning = require('../models/Earning');
const Notification = require('../models/Notification');
const { io } = require('../socket');

class ReferralService {
  constructor() {
    this.maxDirectReferrals = process.env.MAX_DIRECT_REFERRALS || 8;
    this.directEarningPercentage = process.env.DIRECT_EARNING_PERCENTAGE || 5;
    this.indirectEarningPercentage = process.env.INDIRECT_EARNING_PERCENTAGE || 1;
    this.minPurchaseAmount = process.env.MIN_PURCHASE_AMOUNT || 1000;
  }

  /**
   * Register a new user with referral
   */
  async registerUserWithReferral(userData, referralCode = null) {
    try {
      let referredBy = null;
      let referralLevel = 0;

      // Validate referral code if provided
      if (referralCode) {
        const referrer = await User.findOne({ referralCode });
        if (!referrer) {
          throw new Error('Invalid referral code');
        }

        if (!referrer.isActive) {
          throw new Error('Referrer account is inactive');
        }

        if (!referrer.canAddDirectReferral()) {
          throw new Error('Referrer has reached maximum direct referrals limit');
        }

        referredBy = referrer._id;
        referralLevel = 1;
      }

      // Create new user
      const newUser = new User({
        ...userData,
        referredBy,
        referralLevel
      });

      await newUser.save();

      // Update referrer's direct referrals if applicable
      if (referredBy) {
        const referrer = await User.findById(referredBy);
        if (referrer) {
          referrer.addDirectReferral(newUser._id);
          await referrer.save();

          // Create referral notification
          await Notification.createReferralNotification(referredBy, {
            newReferralId: newUser._id,
            referralCode: newUser.referralCode
          });

          // Send real-time notification
          this.sendRealTimeNotification(referredBy, {
            type: 'new_referral',
            data: {
              newReferral: {
                id: newUser._id,
                username: newUser.username,
                fullName: newUser.fullName,
                referralCode: newUser.referralCode
              }
            }
          });
        }
      }

      return {
        success: true,
        user: newUser,
        message: 'User registered successfully'
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Process purchase and calculate earnings
   */
  async processPurchase(purchaseData) {
    try {
      const {
        userId,
        purchaseAmount,
        profitAmount,
        productName = 'Product',
        category = 'General'
      } = purchaseData;

      // Validate user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User account is inactive');
      }

      // Create earning record
      const earning = new Earning({
        transactionId: Earning.generateTransactionId(),
        purchaseAmount,
        profitAmount,
        purchaser: userId,
        purchaseDetails: {
          productName,
          category,
          purchaseDate: new Date()
        }
      });

      // Calculate referral earnings
      await earning.calculateReferralEarnings();

      // Save earning record
      await earning.save();

      // Update user earnings if applicable
      if (earning.isValidForEarnings && earning.referralChain.length > 0) {
        await this.distributeEarnings(earning);
      }

      // Create purchase notification for user
      await Notification.createPurchaseNotification(userId, {
        amount: purchaseAmount,
        productName
      });

      // Send real-time purchase notification
      this.sendRealTimeNotification(userId, {
        type: 'purchase_completed',
        data: {
          purchase: {
            amount: purchaseAmount,
            productName,
            transactionId: earning.transactionId
          }
        }
      });

      return {
        success: true,
        earning,
        message: 'Purchase processed successfully'
      };
    } catch (error) {
      throw new Error(`Purchase processing failed: ${error.message}`);
    }
  }

  /**
   * Distribute earnings to referral chain
   */
  async distributeEarnings(earning) {
    try {
      for (const chain of earning.referralChain) {
        const user = await User.findById(chain.userId);
        if (!user || !user.isActive) continue;

        // Update user earnings
        user.totalEarnings += chain.earningAmount;
        
        if (chain.isDirect) {
          user.directEarnings += chain.earningAmount;
        } else {
          user.indirectEarnings += chain.earningAmount;
        }

        await user.save();

        // Create earning notification
        await Notification.createEarningNotification(chain.userId, {
          amount: chain.earningAmount,
          transactionId: earning.transactionId,
          referralType: chain.isDirect ? 'direct' : 'indirect',
          level: chain.level
        });

        // Send real-time earning notification
        this.sendRealTimeNotification(chain.userId, {
          type: 'earning_received',
          data: {
            earning: {
              amount: chain.earningAmount,
              transactionId: earning.transactionId,
              referralType: chain.isDirect ? 'direct' : 'indirect',
              level: chain.level,
              purchaser: earning.purchaser
            }
          }
        });
      }

      // Update earning status
      earning.status = 'completed';
      earning.processedAt = new Date();
      await earning.save();

    } catch (error) {
      earning.status = 'failed';
      earning.errorMessage = error.message;
      await earning.save();
      throw new Error(`Earnings distribution failed: ${error.message}`);
    }
  }

  /**
   * Get user's referral tree
   */
  async getReferralTree(userId, depth = 2) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const tree = await user.getReferralTree(depth);
      
      // Add earnings data for each referral
      for (let directRef of tree.directReferrals) {
        const earnings = await Earning.getUserEarnings(directRef._id);
        directRef.earnings = earnings;
      }

      for (let indirectRef of tree.indirectReferrals) {
        const earnings = await Earning.getUserEarnings(indirectRef._id);
        indirectRef.earnings = earnings;
      }

      return {
        success: true,
        tree,
        message: 'Referral tree retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to get referral tree: ${error.message}`);
    }
  }

  /**
   * Get user's earnings report
   */
  async getUserEarningsReport(userId, startDate = null, endDate = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const earnings = await Earning.getUserEarnings(userId, startDate, endDate);
      const referralStats = await Earning.getReferralEarnings(userId);

      return {
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            referralCode: user.referralCode,
            totalDirectReferrals: user.totalDirectReferrals,
            totalEarnings: user.totalEarnings,
            directEarnings: user.directEarnings,
            indirectEarnings: user.indirectEarnings
          },
          earnings,
          referralStats: {
            totalEarnings: referralStats.totalEarnings,
            directReferrals: Array.from(referralStats.directReferrals.values()),
            indirectReferrals: Array.from(referralStats.indirectReferrals.values()),
            monthlyBreakdown: Array.from(referralStats.monthlyBreakdown.entries()).map(([month, data]) => ({
              month,
              ...data
            }))
          }
        },
        message: 'Earnings report generated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to generate earnings report: ${error.message}`);
    }
  }

  /**
   * Get system analytics
   */
  async getSystemAnalytics() {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const totalEarnings = await Earning.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalEarningsDistributed' } } }
      ]);

      const recentTransactions = await Earning.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('purchaser', 'username fullName');

      const topEarners = await User.find({ isActive: true })
        .sort({ totalEarnings: -1 })
        .limit(10)
        .select('username fullName totalEarnings directEarnings indirectEarnings');

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          totalEarningsDistributed: totalEarnings[0]?.total || 0,
          recentTransactions,
          topEarners
        },
        message: 'System analytics retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to get system analytics: ${error.message}`);
    }
  }

  /**
   * Validate referral code
   */
  async validateReferralCode(referralCode) {
    try {
      const user = await User.findOne({ referralCode });
      
      if (!user) {
        return {
          valid: false,
          message: 'Invalid referral code'
        };
      }

      if (!user.isActive) {
        return {
          valid: false,
          message: 'Referrer account is inactive'
        };
      }

      if (!user.canAddDirectReferral()) {
        return {
          valid: false,
          message: 'Referrer has reached maximum direct referrals limit'
        };
      }

      return {
        valid: true,
        referrer: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          currentReferrals: user.totalDirectReferrals,
          maxReferrals: this.maxDirectReferrals
        },
        message: 'Referral code is valid'
      };
    } catch (error) {
      throw new Error(`Referral code validation failed: ${error.message}`);
    }
  }

  /**
   * Send real-time notification
   */
  sendRealTimeNotification(userId, notification) {
    try {
      if (io) {
        io.to(`user_${userId}`).emit('notification', notification);
      }
    } catch (error) {
      console.error('Failed to send real-time notification:', error);
    }
  }

  /**
   * Get user's referral statistics
   */
  async getUserReferralStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const directReferrals = await User.find({
        _id: { $in: user.directReferrals }
      }).select('username fullName totalEarnings isActive createdAt');

      const indirectReferrals = await User.find({
        referredBy: { $in: user.directReferrals }
      }).select('username fullName totalEarnings isActive createdAt');

      const directEarnings = await Earning.aggregate([
        {
          $match: {
            'referralChain.userId': user._id,
            'referralChain.isDirect': true,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$referralChain.earningAmount' }
          }
        }
      ]);

      const indirectEarnings = await Earning.aggregate([
        {
          $match: {
            'referralChain.userId': user._id,
            'referralChain.isDirect': false,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$referralChain.earningAmount' }
          }
        }
      ]);

      return {
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            referralCode: user.referralCode,
            totalDirectReferrals: user.totalDirectReferrals,
            maxDirectReferrals: this.maxDirectReferrals,
            totalEarnings: user.totalEarnings,
            directEarnings: user.directEarnings,
            indirectEarnings: user.indirectEarnings
          },
          referrals: {
            direct: directReferrals,
            indirect: indirectReferrals,
            totalDirect: directReferrals.length,
            totalIndirect: indirectReferrals.length
          },
          earnings: {
            totalDirect: directEarnings[0]?.total || 0,
            totalIndirect: indirectEarnings[0]?.total || 0
          }
        },
        message: 'Referral statistics retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to get referral statistics: ${error.message}`);
    }
  }
}

module.exports = new ReferralService(); 