import pool from '../src/config/database.js';

async function viewDatabase() {
  try {
    console.log('📊 DATABASE CONTENT\n');
    
    // School Registry
    const registry = await pool.query('SELECT * FROM school_registry');
    console.log('🏫 SCHOOL REGISTRY:');
    console.table(registry.rows);
    
    // Users
    const users = await pool.query('SELECT id, email, index_number, phone_number, is_verified, created_at FROM users');
    console.log('\n👥 USERS:');
    console.table(users.rows);
    
    // OTP Verifications
    const otps = await pool.query('SELECT * FROM user_verifications');
    console.log('\n🔐 OTP VERIFICATIONS:');
    console.table(otps.rows);
    
  } catch (error) {
    console.error('Error viewing database:', error);
  } finally {
    await pool.end();
  }
}

viewDatabase();