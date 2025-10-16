import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  await clearSession();
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}
