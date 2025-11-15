// test-auth.js
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testAuth() {
  try {
    console.log('🚀 Starting Authentication Tests...\n');

    // 1. Test Registration
    console.log('1. Testing registration...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      username: 'testuser',
      email: 'test@example.com',
      indexNumber: 'TEST001',
      phoneNumber: '+1234567890',
      password: 'password123'
    }, { withCredentials: true });
    
    console.log('✅ Registration:', registerResponse.data.message);
    console.log('   User ID:', registerResponse.data.data.userId);
    if (registerResponse.data.data.otpCode) {
      console.log('   OTP Code:', registerResponse.data.data.otpCode);
    }

    // 2. Test OTP Verification
    console.log('\n2. Testing OTP verification...');
    const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
      email: 'test@example.com',
      otpCode: registerResponse.data.data.otpCode
    }, { withCredentials: true });
    console.log('✅ OTP Verification:', verifyResponse.data.message);

    // 3. Test Login
    console.log('\n3. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    }, { withCredentials: true });
    console.log('✅ Login:', loginResponse.data.message);
    console.log('   User:', loginResponse.data.user.username);

    // 4. Test Current User
    console.log('\n4. Testing current user endpoint...');
    const meResponse = await axios.get(`${API_BASE}/auth/me`, { 
      withCredentials: true 
    });
    console.log('✅ Current user:', meResponse.data.user.email);

    // 5. Test Protected Route
    console.log('\n5. Testing protected route...');
    const protectedResponse = await axios.get(`${API_BASE}/protected`, { 
      withCredentials: true 
    });
    console.log('✅ Protected route:', protectedResponse.data.message);

    // 6. Test Logout
    console.log('\n6. Testing logout...');
    const logoutResponse = await axios.post(`${API_BASE}/auth/logout`, {}, { 
      withCredentials: true 
    });
    console.log('✅ Logout:', logoutResponse.data.message);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuth();