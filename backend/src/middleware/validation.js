// middleware/validation.js
export const validateRegistration = (req, res, next) => {
  const { username, email, indexNumber, phoneNumber, password } = req.body;
  
  const errors = [];

  // Username validation
  if (!username || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (!username || !/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  // Email validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email address is required');
  }

  // Index number validation
  if (!indexNumber || indexNumber.trim().length < 3) {
    errors.push('Index number is required');
  }

  // Password validation
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  // Phone number validation (optional)
  if (phoneNumber && !/^\+?[\d\s-()]+$/.test(phoneNumber)) {
    errors.push('Please provide a valid phone number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Registration validation failed',
      errors: errors
    });
  }

  next();
};