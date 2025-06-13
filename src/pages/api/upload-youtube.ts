import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import * as formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Formidable parse error:', err);
      res.status(500).json({ error: 'Form parse error' });
      return;
    }

    console.log('Parsed fields:', fields);
    console.log('Parsed files:', files);

    try {
      // Handle possible array or undefined values from formidable
      const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
      const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
      const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;

      console.log('Video file:', videoFile);
      console.log('Title:', title);
      console.log('Description:', description);

      if (!videoFile || !videoFile.filepath) {
        res.status(400).json({ error: 'No video file uploaded.' });
        return;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
      );
      oauth2Client.setCredentials({
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            channelId: process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID,
          },
          status: { privacyStatus: 'public' },
        },
        media: { body: fs.createReadStream(videoFile.filepath) },
      })
        .then(response => {
          console.log('YouTube API response:', response.data);
          res.status(200).json({ videoId: response.data.id });
        })
        .catch(error => {
          console.error('YouTube API error:', error);
          const message = error instanceof Error ? error.message : 'Unknown error';
          res.status(500).json({ error: message });
        });
    } catch (error) {
      console.error('Unexpected error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });
}
