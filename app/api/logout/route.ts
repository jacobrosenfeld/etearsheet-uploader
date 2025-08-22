import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/sessions';


export async function POST() {
await clearSession();
return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}