// routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken, verifyToken } from '../middleware/auth.js';
import { sendOTPEmail } from '../services/emailService.js';
import { validateRegistration } from '../middleware/validation.js';

const router = express.Router();
const prisma = new PrismaClient();

// Cleanup unverified users older than 5 minutes
const cleanupUnverifiedUsers = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        isVerified: false,
        createdAt: {
          lt: fiveMinutesAgo
        }
      }
    });
    
    if (deletedUsers.count > 0) {
      console.log(`🧹 Cleaned up ${deletedUsers.count} unverified users`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Run cleanup every minute
setInterval(cleanupUnverifiedUsers, 60 * 1000);

// Register new user WITH SCHOOL REGISTRY VALIDATION
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, indexNumber, phoneNumber, password } = req.body;

    console.log('🔍 Checking school registry for:', { email, indexNumber });

    // Cleanup before registration
    await cleanupUnverifiedUsers();

    // ✅ Check if email and index number exist in school registry
    const schoolRecord = await prisma.schoolRegistry.findFirst({
      where: {
        OR: [
          { 
            email: email.toLowerCase().trim(),
            isActive: true 
          },
          { 
            indexNumber: indexNumber.toUpperCase().trim(),
            isActive: true 
          }
        ]
      }
    });

    console.log('📋 School registry result:', schoolRecord);

    if (!schoolRecord) {
      return res.status(400).json({
        success: false,
        message: 'Email or index number not found in school registry. Please use valid school credentials.'
      });
    }

    // ✅ Verify the email and index number match the same student
    if (schoolRecord.email.toLowerCase() !== email.toLowerCase() || 
        schoolRecord.indexNumber.toUpperCase() !== indexNumber.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: 'Email and index number do not match our school records.'
      });
    }

    // ✅ Map school role to user role
    const mapSchoolRoleToUserRole = (schoolRole) => {
      switch (schoolRole?.toLowerCase()) {
        case 'lecturer':
          return 'INSTRUCTOR';
        case 'admin':
          return 'ADMIN';
        case 'class_rep':
          return 'CLASS_REP';
        case 'student':
        default:
          return 'STUDENT';
      }
    };

    const userRole = mapSchoolRoleToUserRole(schoolRecord.role);

    // Check if verified user already exists
    const existingVerifiedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase(), isVerified: true },
          { indexNumber: indexNumber.toUpperCase(), isVerified: true },
          { phoneNumber, isVerified: true }
        ]
      }
    });

    if (existingVerifiedUser) {
      let conflictField = '';
      if (existingVerifiedUser.email === email.toLowerCase()) conflictField = 'email';
      else if (existingVerifiedUser.indexNumber === indexNumber.toUpperCase()) conflictField = 'index number';
      else if (existingVerifiedUser.phoneNumber === phoneNumber) conflictField = 'phone number';
      
      return res.status(400).json({
        success: false,
        message: `User with this ${conflictField} already exists.`
      });
    }

    // Delete any existing unverified user with same credentials
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: email.toLowerCase(), isVerified: false },
          { indexNumber: indexNumber.toUpperCase(), isVerified: false }
        ]
      }
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP - 6 digits
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user with temporary status (5 MINUTE EXPIRY)
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        indexNumber: indexNumber.toUpperCase(),
        phoneNumber,
        name: schoolRecord.fullName,
        password: hashedPassword,
        role: userRole,
        isVerified: false,
        otpCode,
        otpExpires: new Date(Date.now() + 5 * 60 * 1000) // 5 MINUTES
      },
      select: {
        id: true,
        username: true,
        email: true,
        indexNumber: true,
        name: true,
        role: true,
        createdAt: true,
        otpExpires: true
      }
    });

    // Send OTP email via Gmail
    try {
      await sendOTPEmail(email, otpCode, username);
      console.log(`📧 OTP sent to ${email}`);
    } catch (emailError) {
      // If email fails, delete the user and return error
      await prisma.user.delete({ where: { id: user.id } });
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification OTP. You have 5 minutes to verify.',
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        expiresAt: user.otpExpires,
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
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found or registration expired. Please register again.'
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
      // Delete expired OTP user
      await prisma.user.delete({ where: { email: email.toLowerCase() } });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please register again.'
      });
    }

    // Activate user and CLEAR OTP immediately after use
    const updatedUser = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        isVerified: true,
        otpCode: null, // Clear OTP immediately
        otpExpires: null // Clear expiration
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isVerified: true
      }
    });

    // Generate JWT token and set cookie
    const token = generateToken(updatedUser.id);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Email verified successfully!',
      user: updatedUser
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
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found or registration expired. Please register again.'
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

    // Update user with new OTP (5 MINUTE EXPIRY)
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        otpCode,
        otpExpires: new Date(Date.now() + 5 * 60 * 1000) // 5 MINUTES
      }
    });

    // Send OTP email via Gmail
    try {
      await sendOTPEmail(email, otpCode, user.username);
      console.log(`📧 New OTP sent to ${email}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to resend OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'New OTP sent successfully. You have 5 minutes to verify.',
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
    const { email, indexNumber, password } = req.body;

    if ((!email && !indexNumber) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or index number and password are required'
      });
    }

    // Find user by email OR index number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email?.toLowerCase() },
          { indexNumber: indexNumber?.toUpperCase() }
        ],
        isVerified: true // Only allow verified users to login
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials or account not verified'
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

export default router;