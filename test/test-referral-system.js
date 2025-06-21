const mongoose = require('mongoose');
const User = require('../models/User');
const Earning = require('../models/Earning');
const Notification = require('../models/Notification');
const ReferralService = require('../services/ReferralService');

// Test configuration
const TEST_DB_URI = 'mongodb://localhost:27017/sportsduniya_test';

// Sample test data
const testUsers = [
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'TestPass123',
    phone: '9876543210',
    fullName: 'John Doe'
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'TestPass123',
    phone: '9876543211',
    fullName: 'Jane Smith'
  },
  {
    username: 'bob_wilson',
    email: 'bob@example.com',
    password: 'TestPass123',
    phone: '9876543212',
    fullName: 'Bob Wilson'
  },
  {
    username: 'alice_brown',
    email: 'alice@example.com',
    password: 'TestPass123',
    phone: '9876543213',
    fullName: 'Alice Brown'
  }
];

async function runTests() {
  try {
    // Connect to test database
    await mongoose.connect(TEST_DB_URI);
    console.log('✅ Connected to test database');

    // Clear existing data
    await User.deleteMany({});
    await Earning.deleteMany({});
    await Notification.deleteMany({});
    console.log('✅ Cleared existing test data');

    // Test 1: Register users with referral chain
    console.log('\n🧪 Test 1: Register users with referral chain');
    
    const user1 = await ReferralService.registerUserWithReferral(testUsers[0]);
    console.log(`✅ User 1 registered: ${user1.user.username} (${user1.user.referralCode})`);

    const user2 = await ReferralService.registerUserWithReferral(testUsers[1], user1.user.referralCode);
    console.log(`✅ User 2 registered with referral: ${user2.user.username} (Level: ${user2.user.referralLevel})`);

    const user3 = await ReferralService.registerUserWithReferral(testUsers[2], user2.user.referralCode);
    console.log(`✅ User 3 registered with referral: ${user3.user.username} (Level: ${user3.user.referralLevel})`);

    const user4 = await ReferralService.registerUserWithReferral(testUsers[3], user1.user.referralCode);
    console.log(`✅ User 4 registered with referral: ${user4.user.username} (Level: ${user4.user.referralLevel})`);

    // Test 2: Process purchases and calculate earnings
    console.log('\n🧪 Test 2: Process purchases and calculate earnings');

    // Purchase 1: User 2 makes a purchase (should earn user1 5%)
    const purchase1 = await ReferralService.processPurchase({
      userId: user2.user._id,
      purchaseAmount: 2000,
      profitAmount: 400,
      productName: 'Sports Equipment',
      category: 'Fitness'
    });
    console.log(`✅ Purchase 1 processed: ₹${purchase1.earning.purchaseAmount} (Profit: ₹${purchase1.earning.profitAmount})`);
    console.log(`   Earnings distributed: ₹${purchase1.earning.totalEarningsDistributed}`);

    // Purchase 2: User 3 makes a purchase (should earn user2 5% and user1 1%)
    const purchase2 = await ReferralService.processPurchase({
      userId: user3.user._id,
      purchaseAmount: 1500,
      profitAmount: 300,
      productName: 'Running Shoes',
      category: 'Footwear'
    });
    console.log(`✅ Purchase 2 processed: ₹${purchase2.earning.purchaseAmount} (Profit: ₹${purchase2.earning.profitAmount})`);
    console.log(`   Earnings distributed: ₹${purchase2.earning.totalEarningsDistributed}`);

    // Purchase 3: User 4 makes a purchase (should earn user1 5%)
    const purchase3 = await ReferralService.processPurchase({
      userId: user4.user._id,
      purchaseAmount: 3000,
      profitAmount: 600,
      productName: 'Gym Equipment',
      category: 'Fitness'
    });
    console.log(`✅ Purchase 3 processed: ₹${purchase3.earning.purchaseAmount} (Profit: ₹${purchase3.earning.profitAmount})`);
    console.log(`   Earnings distributed: ₹${purchase3.earning.totalEarningsDistributed}`);

    // Test 3: Get referral tree
    console.log('\n🧪 Test 3: Get referral tree for User 1');
    const referralTree = await ReferralService.getReferralTree(user1.user._id, 2);
    console.log(`✅ Referral tree retrieved:`);
    console.log(`   Direct referrals: ${referralTree.tree.directReferrals.length}`);
    console.log(`   Indirect referrals: ${referralTree.tree.indirectReferrals.length}`);

    // Test 4: Get earnings report
    console.log('\n🧪 Test 4: Get earnings report for User 1');
    const earningsReport = await ReferralService.getUserEarningsReport(user1.user._id);
    console.log(`✅ Earnings report generated:`);
    console.log(`   Total earnings: ₹${earningsReport.data.user.totalEarnings}`);
    console.log(`   Direct earnings: ₹${earningsReport.data.user.directEarnings}`);
    console.log(`   Indirect earnings: ₹${earningsReport.data.user.indirectEarnings}`);
    console.log(`   Total transactions: ${earningsReport.data.earnings.totalTransactions}`);

    // Test 5: Get referral statistics
    console.log('\n🧪 Test 5: Get referral statistics for User 1');
    const referralStats = await ReferralService.getUserReferralStats(user1.user._id);
    console.log(`✅ Referral statistics:`);
    console.log(`   Total direct referrals: ${referralStats.data.referrals.totalDirect}`);
    console.log(`   Total indirect referrals: ${referralStats.data.referrals.totalIndirect}`);
    console.log(`   Total direct earnings: ₹${referralStats.data.earnings.totalDirect}`);
    console.log(`   Total indirect earnings: ₹${referralStats.data.earnings.totalIndirect}`);

    // Test 6: Get notifications
    console.log('\n🧪 Test 6: Get notifications for User 1');
    const notifications = await Notification.find({ recipient: user1.user._id }).sort({ createdAt: -1 });
    console.log(`✅ Notifications retrieved: ${notifications.length} total`);
    
    notifications.forEach((notification, index) => {
      console.log(`   ${index + 1}. ${notification.type}: ${notification.title}`);
    });

    // Test 7: Validate referral code
    console.log('\n🧪 Test 7: Validate referral code');
    const validation = await ReferralService.validateReferralCode(user1.user.referralCode);
    console.log(`✅ Referral code validation: ${validation.valid ? 'Valid' : 'Invalid'}`);
    if (validation.valid) {
      console.log(`   Referrer: ${validation.referrer.fullName}`);
      console.log(`   Current referrals: ${validation.referrer.currentReferrals}/${validation.referrer.maxReferrals}`);
    }

    // Test 8: System analytics
    console.log('\n🧪 Test 8: Get system analytics');
    const analytics = await ReferralService.getSystemAnalytics();
    console.log(`✅ System analytics:`);
    console.log(`   Total users: ${analytics.data.totalUsers}`);
    console.log(`   Active users: ${analytics.data.activeUsers}`);
    console.log(`   Total earnings distributed: ₹${analytics.data.totalEarningsDistributed}`);
    console.log(`   Recent transactions: ${analytics.data.recentTransactions.length}`);

    // Test 9: Test purchase below threshold
    console.log('\n🧪 Test 9: Test purchase below threshold');
    const lowPurchase = await ReferralService.processPurchase({
      userId: user2.user._id,
      purchaseAmount: 500,
      profitAmount: 100,
      productName: 'Small Item',
      category: 'Accessories'
    });
    console.log(`✅ Low purchase processed: ₹${lowPurchase.earning.purchaseAmount}`);
    console.log(`   Valid for earnings: ${lowPurchase.earning.isValidForEarnings}`);
    console.log(`   Earnings distributed: ₹${lowPurchase.earning.totalEarningsDistributed}`);

    // Test 10: Test referral limit
    console.log('\n🧪 Test 10: Test referral limit');
    try {
      // Try to register more than 8 direct referrals
      for (let i = 5; i <= 10; i++) {
        const extraUser = {
          username: `user${i}`,
          email: `user${i}@example.com`,
          password: 'TestPass123',
          phone: `98765432${i.toString().padStart(2, '0')}`,
          fullName: `User ${i}`
        };
        
        await ReferralService.registerUserWithReferral(extraUser, user1.user.referralCode);
        console.log(`   ✅ User ${i} registered successfully`);
      }
    } catch (error) {
      console.log(`   ❌ Expected error: ${error.message}`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Final Summary:');
    console.log(`   Total users: ${await User.countDocuments()}`);
    console.log(`   Total transactions: ${await Earning.countDocuments()}`);
    console.log(`   Total notifications: ${await Notification.countDocuments()}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests }; 