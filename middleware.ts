import { NextRequest, NextResponse } from 'next/server';

// No authentication required - all routes are public
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};