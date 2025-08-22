import { NextRequest, NextResponse } from 'next/server';
import { storeTokens } from '@/lib/google';
import { google } from 'googleapis';


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
return NextResponse.redirect(new URL('/', req.url));
}