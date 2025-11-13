import express from 'express';
import { AuthService } from '../services/authService.js';
import { sendOTPEmail } from '../services/emailService.js';
import { validateRegistration } from '../middleware/validation.js';

const router = express.Router();

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, indexNumber, phoneNumber, password } = req.body;

    // Validate against school registry
    const schoolRegistry = await AuthService.validateSchoolRegistry(email, indexNumber);
    if (!schoolRegistry) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email and index number combination. Please check your school credentials.'
      });
    }

    // Check if user already exists
    const existingUser = await AuthService.checkExistingUser(email, indexNumber, phoneNumber);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, index number, or phone number already exists.'
      });
    }

    // Create temporary user and OTP
    const { user, otpCode } = await AuthService.createTemporaryUser(
      { username, email, indexNumber, phoneNumber, password },
      schoolRegistry
    );

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

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required'
      });
    }

    const result = await AuthService.verifyOTP(email, otpCode);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
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

    const { otpCode } = await AuthService.resendOTP(email);
    await sendOTPEmail(email, otpCode, ''); // Username can be fetched if needed

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // For development only
      ...(process.env.NODE_ENV === 'development' && { otpCode })
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;