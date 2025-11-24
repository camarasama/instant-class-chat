// middleware/auth.js
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token from HTTP-only cookie
const verifyToken = async (req, res, next) => {
  try {
    // Multiple ways to get token
    const token = req.cookies?.token || 
                 req.headers.authorization?.replace('Bearer ', '') || 
                 req.headers.cookie?.split('token=')[1]?.split(';')[0];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Enhanced user query with school registry fields
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        avatar: true, 
        role: true,
        username: true,
        indexNumber: true,    // ✅ Important for school identification
        phoneNumber: true,
        isVerified: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token - user not found.' 
      });
    }

    // ✅ Optional: Check if user is verified (uncomment if you want strict verification)
    // if (!user.isVerified) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Please verify your email before accessing this resource.'
    //   });
    // }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    // More specific error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }

    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed.' 
    });
  }
};

// Socket.IO authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || 
                 socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                 socket.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Enhanced user query for socket connections
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        avatar: true, 
        role: true,
        username: true,
        indexNumber: true,    // ✅ Added for school context
        isVerified: true
      }
    });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // ✅ Require verification for socket connections
    if (!user.isVerified) {
      return next(new Error('Authentication error: Please verify your email to use real-time features'));
    }

    socket.userId = user.id;
    socket.user = user;
    
    console.log(`🔌 Socket authenticated: ${user.name} (${user.role})`);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    next(new Error('Authentication error: Unable to authenticate'));
  }
};

// Enhanced Admin role verification middleware
const requireAdmin = async (req, res, next) => {
  try {
    await verifyToken(req, res, () => {});
    
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator privileges required.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

// Enhanced Instructor or Admin role verification
const requireInstructor = async (req, res, next) => {
  try {
    await verifyToken(req, res, () => {});
    
    const allowedRoles = ['INSTRUCTOR', 'ADMIN'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Instructor or Admin privileges required.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

// Enhanced: Check if user is verified
const requireVerified = async (req, res, next) => {
  try {
    await verifyToken(req, res, () => {});
    
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before accessing this resource.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

// ✅ NEW: Class Representative role verification
const requireClassRep = async (req, res, next) => {
  try {
    await verifyToken(req, res, () => {});
    
    const allowedRoles = ['CLASS_REP', 'INSTRUCTOR', 'ADMIN'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Class Representative privileges required.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

// ✅ NEW: Student or higher role verification
const requireStudent = async (req, res, next) => {
  try {
    await verifyToken(req, res, () => {});
    
    const allowedRoles = ['STUDENT', 'CLASS_REP', 'INSTRUCTOR', 'ADMIN'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Student privileges required.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

export { 
  generateToken, 
  verifyToken, 
  authenticateSocket, 
  requireAdmin, 
  requireInstructor, 
  requireVerified,
  requireClassRep,    // ✅ NEW
  requireStudent      // ✅ NEW
};