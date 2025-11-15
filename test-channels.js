// test-channels.js
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testChannels() {
  try {
    console.log('🚀 Starting Channel Tests...\n');

    // 1. Login first
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    }, { withCredentials: true });
    
    console.log('✅ Login:', loginResponse.data.message);

    // 2. Get user's channels
    console.log('\n2. Getting user channels...');
    const channelsResponse = await axios.get(`${API_BASE}/channels`, { 
      withCredentials: true 
    });
    console.log('✅ User channels count:', channelsResponse.data.data.length);

    // 3. Create a new channel
    console.log('\n3. Creating new channel...');
    const createResponse = await axios.post(`${API_BASE}/channels`, {
      name: 'Test Channel',
      description: 'This is a test channel'
    }, { 
      withCredentials: true 
    });
    console.log('✅ Create channel:', createResponse.data.message);
    const channelId = createResponse.data.data.id;
    console.log('   Channel ID:', channelId);

    // 4. Get channel details
    console.log('\n4. Getting channel details...');
    const channelResponse = await axios.get(`${API_BASE}/channels/${channelId}`, { 
      withCredentials: true 
    });
    console.log('✅ Channel details:', channelResponse.data.data.name);
    console.log('   Members:', channelResponse.data.data.members.length);

    // 5. Get available channels
    console.log('\n5. Getting available channels...');
    const availableResponse = await axios.get(`${API_BASE}/channels/available`, { 
      withCredentials: true 
    });
    console.log('✅ Available channels:', availableResponse.data.data.length);

    // 6. Test joining/leaving (if there are available channels)
    if (availableResponse.data.data.length > 0) {
      const availableChannel = availableResponse.data.data[0];
      console.log('\n6. Testing channel join...');
      const joinResponse = await axios.post(`${API_BASE}/channels/${availableChannel.id}/join`, {}, { 
        withCredentials: true 
      });
      console.log('✅ Join channel:', joinResponse.data.message);

      // Test leaving
      console.log('\n7. Testing channel leave...');
      const leaveResponse = await axios.post(`${API_BASE}/channels/${availableChannel.id}/leave`, {}, { 
        withCredentials: true 
      });
      console.log('✅ Leave channel:', leaveResponse.data.message);
    }

    console.log('\n🎉 All channel tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testChannels();