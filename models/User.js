const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  // Referral System Fields
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralLevel: {
    type: Number,
    default: 0 // 0 = root user, 1 = direct referral, 2 = indirect referral, etc.
  },
  directReferrals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalDirectReferrals: {
    type: Number,
    default: 0
  },
  // Earnings tracking
  totalEarnings: {
    type: Number,
    default: 0
  },
  directEarnings: {
    type: Number,
    default: 0
  },
  indirectEarnings: {
    type: Number,
    default: 0
  },
  // User status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Timestamps
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate unique referral code
userSchema.pre('save', async function(next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = await this.generateReferralCode();
  }
  next();
});

// Instance methods
userSchema.methods.generateReferralCode = async function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const existingUser = await mongoose.model('User').findOne({ referralCode: code });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return code;
};

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.canAddDirectReferral = function() {
  return this.directReferrals.length < process.env.MAX_DIRECT_REFERRALS || 8;
};

userSchema.methods.addDirectReferral = function(referralId) {
  if (this.canAddDirectReferral() && !this.directReferrals.includes(referralId)) {
    this.directReferrals.push(referralId);
    this.totalDirectReferrals = this.directReferrals.length;
    return true;
  }
  return false;
};

userSchema.methods.getReferralTree = async function(depth = 2) {
  const tree = {
    user: this,
    directReferrals: [],
    indirectReferrals: []
  };
  
  // Get direct referrals
  const directRefs = await mongoose.model('User').find({
    _id: { $in: this.directReferrals }
  }).select('username email fullName totalEarnings isActive');
  
  tree.directReferrals = directRefs;
  
  // Get indirect referrals (Level 2)
  if (depth > 1) {
    const indirectRefs = await mongoose.model('User').find({
      referredBy: { $in: this.directReferrals }
    }).select('username email fullName totalEarnings isActive');
    
    tree.indirectReferrals = indirectRefs;
  }
  
  return tree;
};

module.exports = mongoose.model('User', userSchema); 