import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import { setRole } from '@/lib/sessions';


export async function POST(req: NextRequest) {
console.log('Auth init POST request received');
try {
const form = await req.formData();
const pw = form.get('portal_password')?.toString();
const from = form.get('from')?.toString() || '/';
const userPw = process.env.PORTAL_PASSWORD;
const adminPw = process.env.ADMIN_PASSWORD;

console.log('Password received:', pw ? 'yes' : 'no');
console.log('Environment passwords set:', { userPw: !!userPw, adminPw: !!adminPw });

if (!pw) return NextResponse.redirect(new URL('/login', req.url));


if (pw === adminPw) {
console.log('Admin login detected');
await setRole('admin');
// Only admin users authenticate with Google Drive
const authUrl = await getAuthUrl();
return NextResponse.redirect(authUrl);
} else if (pw === userPw) {
console.log('User login detected');
await setRole('user');
// Regular users go directly to the portal (no Google auth)
return NextResponse.redirect(new URL(from, req.url));
} else {
console.log('Invalid password');
return NextResponse.redirect(new URL('/login?error=badpass', req.url));
}
} catch (error) {
console.error('Error in auth/init:', error);
return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
}