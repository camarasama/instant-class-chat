// src/services/test-connection.js
import axios from 'axios';

const testConnection = async () => {
  try {
    console.log('Testing connection to backend...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test login with demo credentials
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'instructor@school.edu',
      password: 'instructor123'
    }, { withCredentials: true });
    
    console.log('✅ Login test:', loginResponse.data);
    
  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
};

testConnection();