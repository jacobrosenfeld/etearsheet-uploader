import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/sessions';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const password = formData.get('password')?.toString();
    const from = formData.get('from')?.toString() || '/';

    if (!password) {
      return NextResponse.redirect(new URL('/login?error=missing_password', req.url));
    }

    const portalPassword = process.env.PORTAL_PASSWORD;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!portalPassword || !adminPassword) {
      console.error('PORTAL_PASSWORD or ADMIN_PASSWORD not set in environment variables');
      return NextResponse.redirect(new URL('/login?error=badpass', req.url));
    }

    // Check if admin password
    if (password === adminPassword) {
      await createSession('admin');
      return NextResponse.redirect(new URL(from, req.url));
    }

    // Check if portal password
    if (password === portalPassword) {
      await createSession('user');
      return NextResponse.redirect(new URL(from, req.url));
    }

    // Wrong password
    return NextResponse.redirect(new URL('/login?error=badpass', req.url));
  } catch (e: any) {
    console.error('Login error:', e);
    return NextResponse.redirect(new URL('/login?error=badpass', req.url));
  }
}
