// test-email.js
import { testEmailConnection } from './src/services/emailService.js';

async function test() {
  console.log('🔧 Testing Gmail connection...');
  const success = await testEmailConnection();
  if (success) {
    console.log('✅ Gmail connection successful!');
  } else {
    console.log('❌ Gmail connection failed');
  }
}

test();