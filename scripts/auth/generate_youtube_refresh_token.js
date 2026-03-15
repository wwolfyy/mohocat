/**
 * YouTube OAuth2 Refresh Token Generator
 *
 * This script generates YouTube API refresh tokens for manual daily refresh workflow.
 *
 * NOTE: Consider using the admin GUI at /admin/youtube-auth for easier token management.
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// OAuth2 credentials from Google Cloud Console
const CLIENT_ID = '266233773870-f3ih7cj734e18aoc3gc4tmt3unfgko9k.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3001/oauth/callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// YouTube API scopes for upload functionality
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

async function generateRefreshToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('='.repeat(80));
  console.log('🔑 YouTube API Refresh Token Generator');
  console.log('='.repeat(80));
  console.log('');
  console.log('⚠️  IMPORTANT: YouTube API refresh tokens expire in 7-14 days');
  console.log("   You'll need to regenerate them regularly.");
  console.log('');
  console.log('💡 TIP: Use the admin GUI at /admin/youtube-auth for easier management');
  console.log('');
  console.log('1. Open this URL in your browser:');
  console.log('   ' + authUrl);
  console.log('');

  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/oauth/callback')) {
      const queryObject = url.parse(req.url, true).query;
      const authCode = queryObject.code;

      if (authCode) {
        try {
          const { tokens } = await oauth2Client.getToken(authCode);

          console.log('');
          console.log('✅ Success! Add these to your .env.local file:');
          console.log('');
          console.log('YOUTUBE_CLIENT_ID=' + CLIENT_ID);
          console.log('YOUTUBE_CLIENT_SECRET=' + CLIENT_SECRET);
          console.log('YOUTUBE_REFRESH_TOKEN=' + tokens.refresh_token);
          console.log('');
          console.log('⚠️  Remember: These tokens expire in 7-14 days!');
          console.log('   Set a reminder to regenerate them regularly.');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h2>✅ Authorization Successful!</h2>
                <p>Check your terminal for the credentials.</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);

          server.close();
        } catch (error) {
          console.error('Error exchanging code for tokens:', error);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h2>❌ Error getting tokens</h2>');
          server.close();
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h2>❌ No authorization code received</h2>');
        server.close();
      }
    }
  });

  server.listen(3001, () => {
    console.log('2. Temporary server running on http://localhost:3001');
    console.log('3. Complete the authorization in your browser');
    console.log('4. The refresh token will be displayed here');
  });
}

if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
  console.log('❌ Please update CLIENT_ID and CLIENT_SECRET in this script first!');
  console.log('\\nGet them from: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

generateRefreshToken().catch(console.error);
