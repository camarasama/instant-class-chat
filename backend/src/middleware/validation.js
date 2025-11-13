export const validateRegistration = (req, res, next) => {
  const { username, email, indexNumber, phoneNumber, password, confirmPassword } = req.body;

  const errors = [];

  // Required fields
  if (!username) errors.push('Username is required');
  if (!email) errors.push('Email is required');
  if (!indexNumber) errors.push('Index number is required');
  if (!phoneNumber) errors.push('Phone number is required');
  if (!password) errors.push('Password is required');

  // Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  // Phone number (10 digits)
  const phoneRegex = /^\d{10}$/;
  if (phoneNumber && !phoneRegex.test(phoneNumber)) {
    errors.push('Phone number must be exactly 10 digits');
  }

  // Password match
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  // Password strength
  if (password && password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};