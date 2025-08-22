import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'GET test works' });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  return NextResponse.json({ 
    message: 'POST test works',
    received: Object.fromEntries(formData.entries())
  });
}
