import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import { setRole } from '@/lib/sessions';


export async function POST(req: NextRequest) {
try {
const form = await req.formData();
const pw = form.get('portal_password')?.toString();
const from = form.get('from')?.toString() || '/';
const userPw = process.env.PORTAL_PASSWORD;
const adminPw = process.env.ADMIN_PASSWORD;

// Check if environment variables are set
if (!userPw || !adminPw) {
  console.error('Missing environment variables: PORTAL_PASSWORD or ADMIN_PASSWORD');
  return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
}

if (!pw) {
  return NextResponse.redirect(new URL('/login?error=missing_password', req.url));
}

if (pw === adminPw) {
await setRole('admin');
// Only admin users authenticate with Google Drive
const authUrl = await getAuthUrl();
return NextResponse.redirect(authUrl);
} else if (pw === userPw) {
await setRole('user');
// Regular users go directly to the portal (no Google auth)
return NextResponse.redirect(new URL(from, req.url));
} else {
return NextResponse.redirect(new URL('/login?error=badpass', req.url));
}
} catch (error) {
console.error('Error in auth/init:', error);
return NextResponse.redirect(new URL('/login?error=server_error', req.url));
}
}