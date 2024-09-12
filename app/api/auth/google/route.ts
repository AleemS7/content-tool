import 'dotenv/config';

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

console.log('Google Route - Client ID:', clientId);
console.log('Google Route - Client Secret:', clientSecret ? '[REDACTED]' : 'undefined');
console.log('Google Route - Redirect URI:', redirectUri);

let oauth2Client: OAuth2Client | null = null;

if (clientId && clientSecret && redirectUri) {
  oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
} else {
  console.error('Google OAuth credentials are not properly configured');
}

export async function GET(req: NextRequest) {
  if (!oauth2Client) {
    console.error('OAuth client not configured');
    return NextResponse.json({ error: 'OAuth client not configured' }, { status: 500 });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload']
  });

  console.log('Generated Auth URL:', authUrl);

  return NextResponse.json({ authUrl });
}

export async function POST(req: NextRequest) {
  if (!oauth2Client) {
    console.error('OAuth client not configured');
    return NextResponse.json({ error: 'OAuth client not configured' }, { status: 500 });
  }

  const { code } = await req.json();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error exchanging code for tokens', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
  }
}