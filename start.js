#!/usr/bin/env node

const readline = require('readline');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🏆 SportsDuniya Referral System Setup');
console.log('=====================================\n');

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 14) {
    console.log('❌ Node.js version 14 or higher is required');
    console.log(`   Current version: ${nodeVersion}`);
    return false;
  }
  console.log(`✅ Node.js version: ${nodeVersion}`);
  
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.log('❌ package.json not found. Please run this script from the project root directory.');
    return false;
  }
  console.log('✅ package.json found');
  
  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    console.log('⚠️  .env file not found. Will create one from template.');
  } else {
    console.log('✅ .env file found');
  }
  
  return true;
}

async function setupEnvironment() {
  console.log('\n⚙️  Setting up environment...\n');
  
  if (!fs.existsSync('.env')) {
    const envTemplate = `# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/sportsduniya_referral

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Referral System Configuration
MAX_DIRECT_REFERRALS=8
DIRECT_EARNING_PERCENTAGE=5
INDIRECT_EARNING_PERCENTAGE=1
MIN_PURCHASE_AMOUNT=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;
    
    fs.writeFileSync('.env', envTemplate);
    console.log('✅ Created .env file from template');
  }
  
  // Ask user to configure MongoDB URI
  const mongoUri = await question('Enter MongoDB connection URI (or press Enter for default): ');
  if (mongoUri.trim()) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const updatedContent = envContent.replace(
      /MONGODB_URI=.*/,
      `MONGODB_URI=${mongoUri.trim()}`
    );
    fs.writeFileSync('.env', updatedContent);
    console.log('✅ Updated MongoDB URI');
  }
  
  // Ask user to set JWT secret
  const jwtSecret = await question('Enter JWT secret (or press Enter for default): ');
  if (jwtSecret.trim()) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const updatedContent = envContent.replace(
      /JWT_SECRET=.*/,
      `JWT_SECRET=${jwtSecret.trim()}`
    );
    fs.writeFileSync('.env', updatedContent);
    console.log('✅ Updated JWT secret');
  }
}

async function installDependencies() {
  console.log('\n📦 Installing dependencies...\n');
  
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install'], { stdio: 'inherit' });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Dependencies installed successfully');
        resolve();
      } else {
        console.log('❌ Failed to install dependencies');
        reject(new Error('npm install failed'));
      }
    });
  });
}

async function runTests() {
  console.log('\n🧪 Running system tests...\n');
  
  return new Promise((resolve, reject) => {
    const test = spawn('node', ['test/test-referral-system.js'], { stdio: 'inherit' });
    
    test.on('close', (code) => {
      if (code === 0) {
        console.log('✅ System tests passed');
        resolve();
      } else {
        console.log('❌ System tests failed');
        reject(new Error('Tests failed'));
      }
    });
  });
}

async function startServer() {
  console.log('\n🚀 Starting server...\n');
  
  const server = spawn('npm', ['run', 'dev'], { stdio: 'inherit' });
  
  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
  });
  
  return server;
}

async function showNextSteps() {
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next Steps:');
  console.log('1. The server is now running on http://localhost:3000');
  console.log('2. Health check: http://localhost:3000/health');
  console.log('3. API documentation: Check the README.md file');
  console.log('4. Test the system: Open examples/client-example.html in your browser');
  console.log('5. Monitor logs: Check the console output for real-time updates');
  
  console.log('\n🔗 Quick Links:');
  console.log('- API Base URL: http://localhost:3000/api');
  console.log('- Socket.IO: http://localhost:3000');
  console.log('- Documentation: README.md');
  
  console.log('\n💡 Tips:');
  console.log('- Use Ctrl+C to stop the server');
  console.log('- Check the logs for any errors or warnings');
  console.log('- The system supports real-time notifications via WebSocket');
  console.log('- All API endpoints are documented in the README');
}

async function main() {
  try {
    // Check prerequisites
    const prerequisitesOk = await checkPrerequisites();
    if (!prerequisitesOk) {
      console.log('\n❌ Prerequisites check failed. Please fix the issues above and try again.');
      process.exit(1);
    }
    
    // Setup environment
    await setupEnvironment();
    
    // Install dependencies
    await installDependencies();
    
    // Run tests
    try {
      await runTests();
    } catch (error) {
      console.log('\n⚠️  Tests failed, but continuing with setup...');
      console.log('   You can run tests manually later with: node test/test-referral-system.js');
    }
    
    // Start server
    const server = await startServer();
    
    // Show next steps
    await showNextSteps();
    
    // Handle server shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down server...');
      server.kill('SIGINT');
      rl.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the setup
main(); 