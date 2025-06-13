require('dotenv').config({ path: '.env.local' }); // Load environment variables from .env.local

const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI // Ensure this matches the registered redirect URI
);

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

console.log('OAuth2 Client Configuration:', {
  clientId: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  redirectUri: process.env.YOUTUBE_REDIRECT_URI,
  scopes: SCOPES,
});

const authUrl = oauth2Client.generateAuthUrl({
  client_id: process.env.YOUTUBE_CLIENT_ID, // Explicitly set client_id
  redirect_uri: process.env.YOUTUBE_REDIRECT_URI, // Explicitly set redirect_uri
  response_type: 'code', // Ensure response_type is set
  scope: SCOPES, // Set the required scopes
  access_type: 'offline', // Ensure offline access for refresh token
  prompt: 'consent', // Force the consent screen
});

console.log('Generated Auth URL:', authUrl);

function getAccessToken() {
  console.log('Authorize this app by visiting this url:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error('Error retrieving access token', err);
        return;
      }
      oauth2Client.setCredentials(token);
      console.log('Your refresh token is:', token.refresh_token);
    });
  });
}

getAccessToken();
