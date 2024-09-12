require('dotenv').config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  },
}

console.log('Next.js Config - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Next.js Config - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '[REDACTED]' : 'undefined');
console.log('Next.js Config - GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);

module.exports = nextConfig