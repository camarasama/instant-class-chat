// services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create transporter with Gmail
const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials not found in environment variables');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

// Send OTP Email
export const sendOTPEmail = async (toEmail, otpCode, username) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: toEmail,
      subject: 'Instant Class Chat - Verify Your Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; color: #2563eb; margin-bottom: 30px; }
                .otp-code { font-size: 32px; font-weight: bold; text-align: center; color: #2563eb; background: #f1f5f9; padding: 15px; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
                .warning { background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Instant Class Chat</h1>
                    <h2>Verify Your Email Address</h2>
                </div>
                
                <p>Hello <strong>${username}</strong>,</p>
                
                <p>Thank you for registering with Instant Class Chat. Use the OTP code below to verify your email address:</p>
                
                <div class="otp-code">${otpCode}</div>
                
                <div class="warning">
                    <strong>⚠️ Important:</strong> 
                    <ul>
                        <li>This OTP will expire in <strong>5 minutes</strong></li>
                        <li>If not verified within 5 minutes, your registration will be cancelled</li>
                        <li>You will need to register again if the OTP expires</li>
                    </ul>
                </div>
                
                <p>If you didn't request this verification, please ignore this email.</p>
                
                <div class="footer">
                    <p>© 2024 Instant Class Chat. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${toEmail}`);
    return result;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Test email connection
export const testEmailConnection = async () => {
  try {
    console.log('🔧 Testing Gmail connection...');
    console.log('📧 Using Gmail account:', process.env.GMAIL_USER);
    
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Gmail connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Gmail connection failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('💡 Tips:');
      console.log('1. Make sure 2-Factor Authentication is enabled on your Gmail');
      console.log('2. Use an App Password (16 characters, no spaces)');
      console.log('3. Check that GMAIL_USER and GMAIL_APP_PASSWORD are in your .env file');
    }
    
    return false;
  }
};

// Test function that can be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmailConnection().then(success => {
    if (success) {
      console.log('🎉 Email service is ready to use!');
      process.exit(0);
    } else {
      console.log('❌ Email service setup failed');
      process.exit(1);
    }
  });
}