import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { authenticateSocket, verifyToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';

const app = express();
const server = http.createServer(app);

// Get client URL from environment or use common defaults
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true
  }
});

// Initialize Prisma Client
const prisma = new PrismaClient();

// CORS configuration - FIXED
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      CLIENT_URL
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
};

// Middleware - APPLY CORS FIX
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Handle preflight requests
app.options('*', cors(corsOptions));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);

// Protected test route
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ 
    message: 'This is protected data!',
    user: req.user
  });
});

// Health check with database connection test
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      status: 'Error', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// Socket.IO authentication
io.use(authenticateSocket);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.user.name} (ID: ${socket.userId}) connected`);

  // Join user to their personal room for notifications
  socket.join(`user_${socket.userId}`);

  // Handle joining channels
  socket.on('join_channel', async (channelId) => {
    try {
      // Verify user has access to this channel
      const channel = await prisma.channel.findFirst({
        where: {
          id: channelId,
          members: {
            some: {
              id: socket.userId
            }
          }
        }
      });

      if (channel) {
        socket.join(`channel_${channelId}`);
        console.log(`User ${socket.user.name} joined channel ${channelId}`);
        
        // Notify others in the channel
        socket.to(`channel_${channelId}`).emit('user_joined', {
          userId: socket.userId,
          userName: socket.user.name,
          channelId: channelId
        });
      } else {
        socket.emit('error', { message: 'Access denied to channel' });
      }
    } catch (error) {
      console.error('Error joining channel:', error);
      socket.emit('error', { message: 'Failed to join channel' });
    }
  });

  // Handle leaving channels
  socket.on('leave_channel', (channelId) => {
    socket.leave(`channel_${channelId}`);
    console.log(`User ${socket.user.name} left channel ${channelId}`);
    
    // Notify others in the channel
    socket.to(`channel_${channelId}`).emit('user_left', {
      userId: socket.userId,
      userName: socket.user.name,
      channelId: channelId
    });
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { channelId, text, fileUrl } = data;
      
      // Validate required fields
      if (!channelId || !text?.trim()) {
        socket.emit('message_error', { error: 'Channel ID and message text are required' });
        return;
      }
      
      // Verify user is still a member of the channel
      const channelMembership = await prisma.channel.findFirst({
        where: {
          id: channelId,
          members: {
            some: {
              id: socket.userId
            }
          }
        }
      });

      if (!channelMembership) {
        socket.emit('message_error', { error: 'You are no longer a member of this channel' });
        return;
      }

      // Save message to database
      const message = await prisma.message.create({
        data: {
          text: text.trim(),
          fileUrl: fileUrl || null,
          authorId: socket.userId,
          channelId: channelId
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      });

      // Emit to all users in the channel
      io.to(`channel_${channelId}`).emit('new_message', message);
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { channelId } = data;
    socket.to(`channel_${channelId}`).emit('user_typing', {
      userId: socket.userId,
      userName: socket.user.name,
      channelId: channelId
    });
  });

  socket.on('typing_stop', (data) => {
    const { channelId } = data;
    socket.to(`channel_${channelId}`).emit('user_stop_typing', {
      userId: socket.userId,
      channelId: channelId
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.user.name} disconnected: ${reason}`);
  });
});

const PORT = process.env.PORT || 5000;

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  
  // Close Socket.IO
  io.close(() => {
    console.log('Socket.IO closed');
  });
  
  // Close HTTP server
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Disconnect Prisma
    await prisma.$disconnect();
    console.log('Database disconnected');
    
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${CLIENT_URL}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});

export { prisma, io };