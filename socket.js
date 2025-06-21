const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid or inactive user'));
      }

      socket.userId = user._id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected with socket ID: ${socket.id}`);

    // Join user's personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Handle user joining referral room
    socket.on('join_referral_room', () => {
      socket.join(`referral_${socket.userId}`);
      console.log(`User ${socket.user.username} joined referral room`);
    });

    // Handle user leaving referral room
    socket.on('leave_referral_room', () => {
      socket.leave(`referral_${socket.userId}`);
      console.log(`User ${socket.user.username} left referral room`);
    });

    // Handle real-time earnings updates subscription
    socket.on('subscribe_earnings', () => {
      socket.join(`earnings_${socket.userId}`);
      console.log(`User ${socket.user.username} subscribed to earnings updates`);
    });

    // Handle real-time earnings updates unsubscription
    socket.on('unsubscribe_earnings', () => {
      socket.leave(`earnings_${socket.userId}`);
      console.log(`User ${socket.user.username} unsubscribed from earnings updates`);
    });

    // Handle referral tree updates subscription
    socket.on('subscribe_referral_tree', () => {
      socket.join(`referral_tree_${socket.userId}`);
      console.log(`User ${socket.user.username} subscribed to referral tree updates`);
    });

    // Handle referral tree updates unsubscription
    socket.on('unsubscribe_referral_tree', () => {
      socket.leave(`referral_tree_${socket.userId}`);
      console.log(`User ${socket.user.username} unsubscribed from referral tree updates`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.username} disconnected`);
    });

    // Handle error
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.username}:`, error);
    });
  });

  return io;
};

// Utility functions for sending notifications
const sendNotification = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('notification', notification);
  }
};

const sendEarningUpdate = (userId, earningData) => {
  if (io) {
    io.to(`earnings_${userId}`).emit('earning_update', earningData);
  }
};

const sendReferralTreeUpdate = (userId, treeData) => {
  if (io) {
    io.to(`referral_tree_${userId}`).emit('referral_tree_update', treeData);
  }
};

const sendReferralUpdate = (userId, referralData) => {
  if (io) {
    io.to(`referral_${userId}`).emit('referral_update', referralData);
  }
};

const broadcastSystemUpdate = (updateData) => {
  if (io) {
    io.emit('system_update', updateData);
  }
};

const getConnectedUsers = () => {
  if (io) {
    return io.sockets.sockets.size;
  }
  return 0;
};

const disconnectUser = (userId) => {
  if (io) {
    const userSockets = io.sockets.adapter.rooms.get(`user_${userId}`);
    if (userSockets) {
      userSockets.forEach(socketId => {
        io.sockets.sockets.get(socketId)?.disconnect();
      });
    }
  }
};

module.exports = {
  initializeSocket,
  sendNotification,
  sendEarningUpdate,
  sendReferralTreeUpdate,
  sendReferralUpdate,
  broadcastSystemUpdate,
  getConnectedUsers,
  disconnectUser,
  io: () => io
}; 