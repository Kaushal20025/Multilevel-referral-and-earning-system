# SportsDuniya Multi-Level Referral and Earning System

A comprehensive multi-level referral system with real-time earnings tracking and live data updates. This system enables users to refer up to 8 people directly and facilitates profit sharing based on a multi-level referral hierarchy.

## 🚀 Features

### Core Features
- **Multi-Level Referral System**: Up to 8 direct referrals per user with 2-level earning structure
- **Real-Time Earnings**: Live profit distribution with instant notifications
- **Profit Distribution Logic**:
  - Direct Referrals: 5% of profits from Level 1 users
  - Indirect Referrals: 1% of profits from Level 2 transactions
  - Minimum purchase threshold: ₹1000 for earnings eligibility
- **Live Data Updates**: Real-time notifications via WebSocket/Socket.IO
- **Comprehensive Analytics**: Detailed reports and visualizations
- **Secure Authentication**: JWT-based authentication with role-based access

### Technical Features
- **Scalable Architecture**: Built with Node.js, Express, and MongoDB
- **Real-Time Communication**: Socket.IO for live updates
- **Data Validation**: Comprehensive input validation and sanitization
- **Security**: Rate limiting, CORS, Helmet, and secure headers
- **Error Handling**: Global error handling with detailed logging
- **Database Optimization**: Indexed queries for better performance

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SportsDuniya_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
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
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  phone: String (unique),
  fullName: String,
  referralCode: String (unique, auto-generated),
  referredBy: ObjectId (ref: User),
  referralLevel: Number (0, 1, 2),
  directReferrals: [ObjectId],
  totalDirectReferrals: Number,
  totalEarnings: Number,
  directEarnings: Number,
  indirectEarnings: Number,
  isActive: Boolean,
  isVerified: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Earnings Collection
```javascript
{
  _id: ObjectId,
  transactionId: String (unique),
  purchaseAmount: Number,
  profitAmount: Number,
  purchaser: ObjectId (ref: User),
  referralChain: [{
    userId: ObjectId,
    level: Number,
    earningPercentage: Number,
    earningAmount: Number,
    isDirect: Boolean
  }],
  totalEarningsDistributed: Number,
  status: String (pending, completed, failed, cancelled),
  isValidForEarnings: Boolean,
  purchaseDetails: {
    productName: String,
    category: String,
    purchaseDate: Date
  },
  processedAt: Date,
  errorMessage: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Notifications Collection
```javascript
{
  _id: ObjectId,
  recipient: ObjectId (ref: User),
  type: String (earning, referral, system, purchase),
  title: String,
  message: String,
  earningData: {
    amount: Number,
    transactionId: String,
    referralType: String,
    level: Number
  },
  referralData: {
    newReferralId: ObjectId,
    referralCode: String
  },
  purchaseData: {
    amount: Number,
    productName: String
  },
  isRead: Boolean,
  isDelivered: Boolean,
  priority: String (low, medium, high),
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Endpoints

### Authentication Routes

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "9876543210",
  "fullName": "John Doe",
  "referralCode": "ABC12345" // Optional
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Smith",
  "phone": "9876543211"
}
```

#### Validate Referral Code
```http
POST /api/auth/validate-referral
Content-Type: application/json

{
  "referralCode": "ABC12345"
}
```

### Referral Routes

#### Get Referral Tree
```http
GET /api/referral/tree?depth=2
Authorization: Bearer <token>
```

#### Get Referral Statistics
```http
GET /api/referral/stats
Authorization: Bearer <token>
```

#### Get Earnings Report
```http
GET /api/referral/earnings?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

#### Process Purchase
```http
POST /api/referral/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "purchaseAmount": 1500,
  "profitAmount": 300,
  "productName": "Sports Equipment",
  "category": "Fitness"
}
```

#### Get Leaderboard
```http
GET /api/referral/leaderboard?limit=10
```

#### Get System Statistics
```http
GET /api/referral/system-stats
```

### Notification Routes

#### Get Notifications
```http
GET /api/notifications?page=1&limit=20&type=earning
Authorization: Bearer <token>
```

#### Get Unread Count
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

#### Mark Notifications as Read
```http
PUT /api/notifications/mark-read
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationIds": ["notification_id_1", "notification_id_2"]
}
```

#### Get Recent Notifications
```http
GET /api/notifications/recent
Authorization: Bearer <token>
```

## 🔌 Real-Time Events (Socket.IO)

### Client Events
```javascript
// Connect with authentication
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Subscribe to earnings updates
socket.emit('subscribe_earnings');

// Subscribe to referral tree updates
socket.emit('subscribe_referral_tree');

// Join referral room
socket.emit('join_referral_room');
```

### Server Events
```javascript
// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// Listen for earning updates
socket.on('earning_update', (data) => {
  console.log('Earning update:', data);
});

// Listen for referral tree updates
socket.on('referral_tree_update', (data) => {
  console.log('Referral tree update:', data);
});

// Listen for referral updates
socket.on('referral_update', (data) => {
  console.log('Referral update:', data);
});

// Listen for system updates
socket.on('system_update', (data) => {
  console.log('System update:', data);
});
```

## 📊 Business Logic

### Referral System Rules
1. **Maximum Direct Referrals**: 8 per user
2. **Earning Structure**:
   - Level 1 (Direct): 5% of profit
   - Level 2 (Indirect): 1% of profit
3. **Minimum Purchase**: ₹1000 for earnings eligibility
4. **Real-Time Distribution**: Earnings calculated and distributed immediately

### Example Scenario
```
User A refers User B (Level 1)
User B refers User C (Level 2)

When User C makes a purchase of ₹2000 with ₹400 profit:
- User A earns: ₹400 × 1% = ₹4 (indirect)
- User B earns: ₹400 × 5% = ₹20 (direct)
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

## 📈 Monitoring & Analytics

### Health Check
```http
GET /health
```

### System Metrics
- Total users and active users
- Total earnings distributed
- Transaction volume
- Top earners leaderboard
- Referral conversion rates

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **Data Sanitization**: Prevents injection attacks

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Configure MongoDB Atlas or production database
4. Set up environment variables
5. Use PM2 or similar process manager

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `MAX_DIRECT_REFERRALS` | Max direct referrals per user | 8 |
| `DIRECT_EARNING_PERCENTAGE` | Direct referral earning % | 5 |
| `INDIRECT_EARNING_PERCENTAGE` | Indirect referral earning % | 1 |
| `MIN_PURCHASE_AMOUNT` | Minimum purchase for earnings | 1000 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Changelog

### v1.0.0
- Initial release
- Multi-level referral system
- Real-time earnings tracking
- Socket.IO integration
- Comprehensive API endpoints
- Security features
- Analytics and reporting 