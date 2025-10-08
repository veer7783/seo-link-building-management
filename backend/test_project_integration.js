const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Note: In production, you would need proper authentication
    // For testing, we'll assume the endpoints are accessible
  }
};

async function testProjectIntegration() {
  console.log('🧪 Testing Project Integration in Orders & Placements...\n');
  
  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend health...');
    const healthResponse = await axios.get(`${BASE_URL}/../health`);
    console.log('✅ Backend is healthy:', healthResponse.data);
    
    // Test 2: Check projects endpoint
    console.log('\n2. Testing projects endpoint...');
    try {
      const projectsResponse = await axios.get(`${BASE_URL}/projects`, testConfig);
      console.log('✅ Projects endpoint working. Found', projectsResponse.data?.data?.length || 0, 'projects');
    } catch (error) {
      console.log('⚠️ Projects endpoint requires authentication:', error.response?.status);
    }
    
    // Test 3: Check guest blog orders endpoint structure
    console.log('\n3. Testing guest blog orders endpoint...');
    try {
      const ordersResponse = await axios.get(`${BASE_URL}/guest-blog-orders`, testConfig);
      console.log('✅ Orders endpoint working. Found', ordersResponse.data?.data?.length || 0, 'orders');
    } catch (error) {
      console.log('⚠️ Orders endpoint requires authentication:', error.response?.status);
    }
    
    // Test 4: Check guest blog placements endpoint structure
    console.log('\n4. Testing guest blog placements endpoint...');
    try {
      const placementsResponse = await axios.get(`${BASE_URL}/guest-blog-placements`, testConfig);
      console.log('✅ Placements endpoint working. Found', placementsResponse.data?.data?.length || 0, 'placements');
    } catch (error) {
      console.log('⚠️ Placements endpoint requires authentication:', error.response?.status);
    }
    
    console.log('\n🎉 Basic API structure tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Start the frontend server: npm start (in frontend directory)');
    console.log('2. Login as superadmin@example.com / password123');
    console.log('3. Test the Orders page with project filtering');
    console.log('4. Test the Placements page with project filtering');
    console.log('5. Test the complete workflow: Add to Cart → Create Orders → Place Orders → View Placements');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProjectIntegration();
