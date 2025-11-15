import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken, verifyToken } from '../middleware/auth.js';
import { sendOTPEmail } from '../services/emailService.js';
import { validateRegistration } from '../middleware/validation.js';

const router = express.Router();
const prisma = new PrismaClient();

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, indexNumber, phoneNumber, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { indexNumber },
          { phoneNumber }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, index number, or phone number already exists.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user with temporary status
    const user = await prisma.user.create({
      data: {
        username,
        email,
        indexNumber,
        phoneNumber,
        password: hashedPassword,
        role: 'STUDENT', // Default role
        isVerified: false,
        otpCode,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      },
      select: {
        id: true,
        username: true,
        email: true,
        indexNumber: true,
        role: true,
        createdAt: true
      }
    });

    // Send OTP email
    await sendOTPEmail(email, otpCode, username);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification OTP.',
      data: {
        userId: user.id,
        email: user.email,
        // Don't send OTP in production - for development only
        ...(process.env.NODE_ENV === 'development' && { otpCode })
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// Verify OTP and activate user
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already verified'
      });
    }

    if (user.otpCode !== otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code'
      });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Activate user
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpires: null
      }
    });

    // Generate JWT token and set cookie
    const token = generateToken(user.id);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: true
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already verified'
      });
    }

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update user with new OTP
    await prisma.user.update({
      where: { email },
      data: {
        otpCode,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    // Send OTP email
    await sendOTPEmail(email, otpCode, user.username);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // For development only
      ...(process.env.NODE_ENV === 'development' && { otpCode })
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token and set HTTP-only cookie
    const token = generateToken(user.id);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        indexNumber: user.indexNumber,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ 
    success: true,
    message: 'Logout successful' 
  });
});

// Get current user
router.get('/me', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});
// Add this to your backend routes/auth.js temporarily
router.post('/register-debug', async (req, res) => {
  try {
    console.log('📨 Received registration data:', req.body);
    
    const { username, email, indexNumber, phoneNumber, password } = req.body;
    
    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { indexNumber },
          { phoneNumber }
        ]
      }
    });

    console.log('🔍 Existing user check:', existingUser);

    if (existingUser) {
      let conflictField = '';
      if (existingUser.email === email) conflictField = 'email';
      else if (existingUser.indexNumber === indexNumber) conflictField = 'indexNumber';
      else if (existingUser.phoneNumber === phoneNumber) conflictField = 'phoneNumber';
      
      return res.status(400).json({
        success: false,
        message: `User with this ${conflictField} already exists.`
      });
    }

    res.json({
      success: true,
      message: 'Data looks good!',
      received: req.body
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint error'
    });
  }
});
export default router;