import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import { setRole } from '@/lib/sessions';


export async function POST(req: NextRequest) {
const form = await req.formData();
const pw = form.get('portal_password')?.toString();
const from = form.get('from')?.toString() || '/';
const userPw = process.env.PORTAL_PASSWORD;
const adminPw = process.env.ADMIN_PASSWORD;


if (!pw) return NextResponse.redirect(new URL('/login', req.url));


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
}