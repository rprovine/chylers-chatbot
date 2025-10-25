const axios = require('axios');

async function testOrderTracking() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Order Tracking Implementation\n');
  
  // Test 1: Direct API endpoint with missing parameters
  console.log('Test 1: Missing order number');
  try {
    const response = await axios.post(`${baseUrl}/api/track-order`, {
      email: 'test@example.com'
    });
    console.log('❌ Should have failed but got:', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected missing order number');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 2: Missing email
  console.log('\nTest 2: Missing email');
  try {
    const response = await axios.post(`${baseUrl}/api/track-order`, {
      orderNumber: '12345'
    });
    console.log('❌ Should have failed but got:', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected missing email');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 3: Valid format but no Shopify credentials / order not found
  console.log('\nTest 3: Valid format (order not found or no Shopify creds)');
  try {
    const response = await axios.post(`${baseUrl}/api/track-order`, {
      orderNumber: '12345',
      email: 'test@example.com'
    });
    console.log('Response:', response.data.message);
    if (response.data.message.includes("don't have access") || 
        response.data.message.includes("couldn't find")) {
      console.log('✅ Handled gracefully');
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  // Test 4: Chat endpoint with tracking tag
  console.log('\nTest 4: Chat endpoint with [TRACK_ORDER:...] tag simulation');
  try {
    const response = await axios.post(`${baseUrl}/chat`, {
      message: 'I want to track my order',
      sessionId: 'test-session-' + Date.now()
    });
    console.log('Bot response:', response.data.message.substring(0, 200) + '...');
    console.log('✅ Chat endpoint responding');
  } catch (error) {
    console.log('❌ Chat error:', error.message);
  }
}

testOrderTracking().catch(console.error);
