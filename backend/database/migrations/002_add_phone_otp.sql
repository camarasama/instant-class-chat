-- Add phone number to users table
ALTER TABLE users ADD COLUMN phone_number VARCHAR(15);

-- Create OTP verification table
CREATE TABLE user_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    otp_type VARCHAR(20) DEFAULT 'email_verification',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for OTP lookups
CREATE INDEX idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_otp_code ON user_verifications(otp_code);