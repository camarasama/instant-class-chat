import nodemailer from 'nodemailer';

// For development - use Ethereal.email (fake SMTP service)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER || 'your-ethereal-email',
    pass: process.env.SMTP_PASS || 'your-ethereal-password',
  },
});

export const sendOTPEmail = async (email, otpCode, username) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Instant Class Chat" <noreply@classchat.edu>',
    to: email,
    subject: 'Verify Your Account - Instant Class Chat',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Instant Class Chat!</h2>
        <p>Hello ${username},</p>
        <p>Thank you for registering. Use the OTP code below to verify your account:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #2563eb; margin: 0; font-size: 32px; letter-spacing: 5px;">${otpCode}</h1>
        </div>
        <p>This code will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">Instant Class Chat Team</p>
      </div>
    `,
  };

  // In development, log the OTP instead of sending real email
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 OTP for ${email}: ${otpCode}`);
    return { previewUrl: `https://ethereal.email/message/${Date.now()}` };
  }

  return await transporter.sendMail(mailOptions);
};