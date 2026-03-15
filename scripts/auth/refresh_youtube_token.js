/**
 * YouTube OAuth Token Refresh Script
 * Run this script periodically (e.g., via cron job) to keep tokens fresh
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function refreshYouTubeToken() {
  try {
    console.log('🔄 Starting YouTube token refresh...');

    // Load current environment variables
    require('dotenv').config({ path: '.env.local' });

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    });

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log('✅ Token refreshed successfully');

    // If we got a new refresh token, update the environment file
    if (
      credentials.refresh_token &&
      credentials.refresh_token !== process.env.YOUTUBE_REFRESH_TOKEN
    ) {
      console.log('🔑 New refresh token received, updating .env.local...');

      const envPath = path.join(__dirname, '../.env.local');
      let envContent = fs.readFileSync(envPath, 'utf8');

      // Update the refresh token in the file
      envContent = envContent.replace(
        /YOUTUBE_REFRESH_TOKEN=.*/,
        `YOUTUBE_REFRESH_TOKEN=${credentials.refresh_token}`
      );

      fs.writeFileSync(envPath, envContent);
      console.log('✅ Environment file updated with new refresh token');
    }

    // Test the token by making a simple API call
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    await youtube.channels.list({ part: ['snippet'], mine: true });
    console.log('✅ Token validation successful');

    return { success: true, message: 'Token refreshed successfully' };
  } catch (error) {
    console.error('❌ Token refresh failed:', error.message);

    if (error.message.includes('invalid_grant')) {
      console.log('🚨 Refresh token is invalid. You need to re-authorize the application.');
      console.log('Run: node scripts/auth/generate_youtube_refresh_token.js');
    }

    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  refreshYouTubeToken()
    .then((result) => {
      if (result.success) {
        console.log('🎉 Token refresh completed successfully');
        process.exit(0);
      } else {
        console.error('💥 Token refresh failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { refreshYouTubeToken };
