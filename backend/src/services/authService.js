import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { sendOTPEmail } from './emailService.js';

export class AuthService {
  // Validate user against school registry
  static async validateSchoolRegistry(email, indexNumber) {
    const query = `
      SELECT id, full_name, role 
      FROM school_registry 
      WHERE email = $1 AND index_number = $2 AND is_active = true
    `;
    
    const result = await pool.query(query, [email, indexNumber]);
    return result.rows[0] || null;
  }

  // Check if user already exists
  static async checkExistingUser(email, indexNumber, phoneNumber) {
    const query = `
      SELECT id FROM users 
      WHERE email = $1 OR index_number = $2 OR phone_number = $3
    `;
    
    const result = await pool.query(query, [email, indexNumber, phoneNumber]);
    return result.rows[0] || null;
  }

  // Create new user (temporary - not verified)
  static async createTemporaryUser(userData, schoolRegistry) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Insert user
      const userQuery = `
        INSERT INTO users (
          school_registry_id, index_number, email, phone_number, 
          password_hash, display_name, is_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, index_number, display_name
      `;
      
      const userResult = await client.query(userQuery, [
        schoolRegistry.id,
        userData.indexNumber,
        userData.email,
        userData.phoneNumber,
        passwordHash,
        userData.username,
        false, // is_verified
        true   // is_active but not verified
      ]);

      // Generate OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const otpQuery = `
        INSERT INTO user_verifications (user_id, otp_code, expires_at)
        VALUES ($1, $2, $3)
      `;
      
      await client.query(otpQuery, [userResult.rows[0].id, otpCode, expiresAt]);

      await client.query('COMMIT');

      return {
        user: userResult.rows[0],
        otpCode
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Verify OTP and activate user
  static async verifyOTP(email, otpCode) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find user and valid OTP
      const verificationQuery = `
        SELECT uv.*, u.id as user_id, u.email
        FROM user_verifications uv
        JOIN users u ON uv.user_id = u.id
        WHERE u.email = $1 
          AND uv.otp_code = $2 
          AND uv.expires_at > NOW() 
          AND uv.is_used = false
        ORDER BY uv.created_at DESC
        LIMIT 1
      `;
      
      const verificationResult = await client.query(verificationQuery, [email, otpCode]);
      
      if (verificationResult.rows.length === 0) {
        throw new Error('Invalid or expired OTP');
      }

      const verification = verificationResult.rows[0];

      // Mark OTP as used
      await client.query(
        'UPDATE user_verifications SET is_used = true WHERE id = $1',
        [verification.id]
      );

      // Activate user
      await client.query(
        'UPDATE users SET is_verified = true WHERE id = $1',
        [verification.user_id]
      );

      await client.query('COMMIT');

      return { success: true, message: 'Account activated successfully' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Resend OTP
  static async resendOTP(email) {
    const userQuery = 'SELECT id FROM users WHERE email = $1 AND is_verified = false';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found or already verified');
    }

    const userId = userResult.rows[0].id;
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const otpQuery = `
      INSERT INTO user_verifications (user_id, otp_code, expires_at)
      VALUES ($1, $2, $3)
    `;
    
    await pool.query(otpQuery, [userId, otpCode, expiresAt]);

    return { otpCode };
  }
}