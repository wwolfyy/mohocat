/**
 * Test the admin API endpoint to ensure it can update Cloud Storage
 */

const { exportAllToCloudStorage } = require('./scripts/migration/export_all_to_cloud_storage');

async function testAdminUpdate() {
  console.log('🧪 Testing admin API update functionality...');

  try {
    console.log('Testing exportAllToCloudStorage function...');
    const result = await exportAllToCloudStorage();
    console.log('✅ Admin update test successful!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Admin update test failed:', error.message);
    console.error('Full error:', error);
  }
}

testAdminUpdate();
