import { NextRequest, NextResponse } from 'next/server';
import { storeTokens } from '@/lib/google';
import { google } from 'googleapis';
import { readConfig, writeConfig } from '@/lib/configStore';


export async function GET(req: NextRequest) {
const url = new URL(req.url);
const code = url.searchParams.get('code');
const error = url.searchParams.get('error');
if (error) return NextResponse.redirect(new URL('/login?error=' + error, req.url));
if (!code) return NextResponse.redirect(new URL('/login?error=missing_code', req.url));


const oauth2 = new google.auth.OAuth2(
process.env.GOOGLE_CLIENT_ID,
process.env.GOOGLE_CLIENT_SECRET,
process.env.GOOGLE_REDIRECT_URI,
);


const { tokens } = await oauth2.getToken(code);
await storeTokens(tokens);

// Configure Google Drive settings in config
try {
  const config = await readConfig();
  const updatedConfig = {
    ...config,
    driveSettings: {
      isConfigured: true,
      rootFolderName: 'JJA eTearsheets',
      rootFolderId: null // Will be created on first upload
    }
  };
  await writeConfig(updatedConfig);
} catch (error) {
  console.error('Failed to update config with Drive settings:', error);
}

return NextResponse.redirect(new URL('/admin', req.url));
}