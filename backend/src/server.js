import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { authenticateSocket } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
  }
});

// Initialize Prisma Client
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: "http://localhost:5173", // Vite default port
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);

// Protected test route
import { verifyToken } from './middleware/auth.js';
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
  console.log(`User ${socket.user.name} connected`);

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
      }
    } catch (error) {
      console.error('Error joining channel:', error);
    }
  });

  // Handle leaving channels
  socket.on('leave_channel', (channelId) => {
    socket.leave(`channel_${channelId}`);
    console.log(`User ${socket.user.name} left channel ${channelId}`);
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { channelId, text, fileUrl } = data;
      
      // Save message to database
      const message = await prisma.message.create({
        data: {
          text,
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

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.name} disconnected`);
  });
});

const PORT = process.env.PORT || 5000;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { prisma };