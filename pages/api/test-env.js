export default function handler(req, res) {
  res.status(200).json({ 
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '[REDACTED]' : 'undefined',
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  })
}