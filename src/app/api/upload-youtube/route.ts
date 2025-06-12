import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

export const segmentConfig = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parse error' });

    const videoFile = files.video as formidable.File;
    const title = fields.title as string;
    const description = fields.description as string;

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    try {
      const response = await youtube.videos.insert({
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
      });
      res.status(200).json({ videoId: response.data.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
