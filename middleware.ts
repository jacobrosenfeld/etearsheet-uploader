import { NextRequest, NextResponse } from 'next/server';


const PUBLIC_PATHS = ["/login", "/api/auth", "/api/auth/init", "/api/auth/callback", "/api/logout", "/privacy", "/_next", "/favicon.svg", "/favicon-light.svg", "/favicon-dark.svg", "/jja_white.svg", "/apple-touch-icon.png", "/favicon-32x32.png", "/favicon-16x16.png"];


export function middleware(req: NextRequest) {
const { pathname } = req.nextUrl;
const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
if (isPublic) return NextResponse.next();


const role = req.cookies.get('role')?.value; // 'user' | 'admin'
if (!role) {
const url = req.nextUrl.clone();
url.pathname = '/login';
url.searchParams.set('from', pathname);
return NextResponse.redirect(url);
}


// Admin-only route protection
if (pathname.startsWith('/admin') && role !== 'admin') {
const url = req.nextUrl.clone();
url.pathname = '/';
return NextResponse.redirect(url);
}


return NextResponse.next();
}


export const config = {
matcher: ['/((?!_next|favicon.ico).*)'],
};