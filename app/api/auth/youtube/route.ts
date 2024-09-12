import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';

const youtube = google.youtube('v3');

async function loginToPlatform(platform: string) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
      defaultViewport: null
    });
    const page = await browser.newPage();
    
    try {
      switch (platform) {
        case 'YouTube':
          await page.goto('https://accounts.google.com/ServiceLogin?service=youtube');
          
          // Wait for user to manually log in
          await page.evaluate(() => {
            return new Promise((resolve) => {
              const checkInterval = setInterval(() => {
                if (document.querySelector('#avatar-btn')) {
                  clearInterval(checkInterval);
                  resolve(true);
                }
              }, 1000);
            });
          });
          
          // Navigate to YouTube Studio
          await page.goto('https://studio.youtube.com');
          await page.waitForSelector('#menu-paper-icon-item-1', { timeout: 60000 });
          break;
        case 'Instagram':
          await page.goto('https://www.instagram.com/accounts/login/');
          // Wait for the Instagram feed to load, indicating successful login
          await page.waitForSelector('article', { timeout: 300000 });
          break;
        case 'X':
          await page.goto('https://twitter.com/i/flow/login');
          await page.waitForSelector('[data-testid="AppTabBar_Home_Link"]', { timeout: 300000 });
          break;
        case 'TikTok':
          await page.goto('https://www.tiktok.com/login');
          await page.waitForSelector('[data-e2e="profile-icon"]', { timeout: 300000 });
          break;
        default:
          throw new Error('Unsupported platform');
      }

      console.log(`User completed login for ${platform}`);

      const cookies = await page.cookies();
      console.log('Retrieved cookies:', cookies.length);

      return { cookies, success: true };
    } catch (error) {
      console.error(`Error during ${platform} login:`, error);
      return { cookies: [], success: false };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error(`Error launching browser for ${platform} login:`, error);
    return { cookies: [], success: false };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');

  if (!platform) {
    return NextResponse.json({ error: 'Platform not specified' }, { status: 400 });
  }

  const { cookies, success } = await loginToPlatform(platform);
  
  if (success) {
    return NextResponse.json({ cookies, success });
  } else {
    return NextResponse.json({ error: 'Login failed', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log('Received POST request for video upload');
  
  const formData = await req.formData();
  console.log('Form data keys:', Array.from(formData.keys()));

  const videoFile = formData.get('videoFile') as File;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const tags = (formData.get('tags') as string).split(',').map(tag => tag.trim());
  const platform = formData.get('platform') as string;

  console.log('Video file:', videoFile?.name);
  console.log('Title:', title);
  console.log('Description:', description);
  console.log('Tags:', tags);
  console.log('Platform:', platform);

  if (platform === 'YouTube') {
    // Use Google API for YouTube upload
    const tokens = JSON.parse(req.headers.get('x-auth-tokens') || '{}');
    if (!tokens.access_token) {
      return NextResponse.json({ error: 'Not authenticated', needsAuth: true }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);

    try {
      const fileBuffer = await videoFile.arrayBuffer();
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, videoFile.name);
      fs.writeFileSync(tempFilePath, Buffer.from(fileBuffer));

      const res = await youtube.videos.insert({
        auth: oauth2Client,
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            tags,
          },
          status: {
            privacyStatus: 'public',
          },
        },
        media: {
          body: fs.createReadStream(tempFilePath),
        },
      });

      fs.unlinkSync(tempFilePath);

      console.log('Video uploaded successfully to YouTube');
      return NextResponse.json({ success: true, videoId: res.data.id });
    } catch (error) {
      console.error('Error uploading to YouTube:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } else {
    // Use Puppeteer for other platforms
    const cookies = JSON.parse(req.headers.get('x-auth-cookies') || '[]');
    if (cookies.length === 0) {
      console.error('No authentication cookies found');
      return NextResponse.json({ error: 'Not authenticated', needsAuth: true }, { status: 401 });
    }

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setCookie(...cookies);

    try {
      const fileBuffer = await videoFile.arrayBuffer();
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, videoFile.name);
      fs.writeFileSync(tempFilePath, Buffer.from(fileBuffer));

      switch (platform) {
        case 'Instagram':
          await uploadToInstagram(page, tempFilePath, title, description, tags);
          break;
        case 'X':
          await uploadToX(page, tempFilePath, title, description, tags);
          break;
        case 'TikTok':
          await uploadToTikTok(page, tempFilePath, title, description, tags);
          break;
        default:
          throw new Error('Unsupported platform');
      }

      fs.unlinkSync(tempFilePath);
      console.log(`Video upload process completed for ${platform}`);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(`Error during upload to ${platform}:`, error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    } finally {
      await browser.close();
    }
  }
}

async function uploadToInstagram(page: puppeteer.Page, filePath: string, title: string, description: string, tags: string[]) {
  await page.goto('https://www.instagram.com');
  await page.waitForSelector('svg[aria-label="New post"]', { timeout: 60000 });
  await page.click('svg[aria-label="New post"]');

  const fileInput = await page.$('input[type="file"]');
  await fileInput?.uploadFile(filePath);

  await page.waitForSelector('button:has-text("Next")', { timeout: 60000 });
  await page.click('button:has-text("Next")');

  await page.waitForSelector('textarea[aria-label="Write a caption..."]', { timeout: 60000 });
  await page.type('textarea[aria-label="Write a caption..."]', `${title}\n\n${description}\n\n${tags.map(tag => `#${tag}`).join(' ')}`);

  await page.click('button:has-text("Share")');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

async function uploadToX(page: puppeteer.Page, filePath: string, title: string, description: string, tags: string[]) {
  await page.goto('https://twitter.com/compose/tweet');
  
  const fileInput = await page.$('input[type="file"][multiple]');
  await fileInput?.uploadFile(filePath);

  await page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: 60000 });
  await page.type('div[data-testid="tweetTextarea_0"]', `${title}\n\n${description}\n\n${tags.map(tag => `#${tag}`).join(' ')}`);

  await page.click('div[data-testid="tweetButtonInline"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

async function uploadToTikTok(page: puppeteer.Page, filePath: string, title: string, description: string, tags: string[]) {
  await page.goto('https://www.tiktok.com/upload?lang=en');
  
  const fileInput = await page.$('input[type="file"]');
  await fileInput?.uploadFile(filePath);

  await page.waitForSelector('div[data-text="true"]', { timeout: 60000 });
  await page.type('div[data-text="true"]', `${title}\n\n${description}\n\n${tags.map(tag => `#${tag}`).join(' ')}`);

  await page.click('button[data-e2e="upload-button"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}