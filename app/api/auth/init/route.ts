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
} else if (pw === userPw) {
await setRole('user');
} else {
return NextResponse.redirect(new URL('/login?error=badpass', req.url));
}


const authUrl = await getAuthUrl();
// After password, go connect Google immediately
return NextResponse.redirect(authUrl);
}