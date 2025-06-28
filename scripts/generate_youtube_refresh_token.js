/**
 * YouTube OAuth2 Refresh Token Generator
 *
 * This script helps you generate a refresh token for YouTube API access.
 * Run this script once to get your refresh token, then use it in .env.local
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
// Removed 'open' package - we'll use manual browser opening

// Replace these with your OAuth2 credentials from Google Cloud Console
const CLIENT_ID = '266233773870-f3ih7cj734e18aoc3gc4tmt3unfgko9k.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// YouTube API scopes needed for uploading videos and fetching playlists
// Including all scopes that YouTube API expects based on the error message
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtubepartner'
];

async function generateRefreshToken() {
  // Generate the authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important: This ensures we get a refresh token
    scope: SCOPES,
    prompt: 'consent' // Force consent screen to ensure refresh token
  });

  console.log('1. Please open this URL in your browser:');
  console.log('   ' + authUrl);
  console.log('');

  // Removed automatic browser opening - user needs to manually open URL

  // Create a simple HTTP server to handle the OAuth callback
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/oauth/callback')) {
      const queryObject = url.parse(req.url, true).query;
      const authCode = queryObject.code;

      if (authCode) {
        try {
          // Exchange the authorization code for tokens
          const { tokens } = await oauth2Client.getToken(authCode);

          console.log('\\n✅ Success! Your credentials:');
          console.log('YOUTUBE_CLIENT_ID=' + CLIENT_ID);
          console.log('YOUTUBE_CLIENT_SECRET=' + CLIENT_SECRET);
          console.log('YOUTUBE_REDIRECT_URI=' + REDIRECT_URI);
          console.log('YOUTUBE_REFRESH_TOKEN=' + tokens.refresh_token);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h2>✅ Authorization Successful!</h2>
                <p>You can close this window and check your terminal for the credentials.</p>
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

  server.listen(3000, () => {
    console.log('2. Temporary server running on http://localhost:3000');
    console.log('3. Complete the authorization in your browser');
    console.log('4. The refresh token will be displayed here once complete');
  });
}

// Check if credentials are set
if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
  console.log('❌ Please update CLIENT_ID and CLIENT_SECRET in this script first!');
  console.log('\\nGet them from: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

generateRefreshToken().catch(console.error);
