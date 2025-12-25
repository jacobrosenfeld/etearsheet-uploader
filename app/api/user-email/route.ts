import { NextResponse } from 'next/server';
import { getUserEmail } from '@/lib/sessions';

export async function GET() {
  const email = getUserEmail();
  
  if (!email) {
    return NextResponse.json({ 
      error: 'User email not available' 
    }, { status: 404 });
  }
  
  return NextResponse.json({ email });
}
