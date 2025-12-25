import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { verifyUploadCompletion } from '@/lib/google';

// This endpoint verifies that the file was successfully uploaded to Google Drive
// and returns the file metadata
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check if user is authenticated
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    // Verify the file exists in Google Drive
    const fileMetadata = await verifyUploadCompletion(fileId);

    return NextResponse.json({ ok: true, file: fileMetadata });
  } catch (e: any) {
    console.error('Error verifying upload:', e);
    return NextResponse.json({ error: e?.message || 'Failed to verify upload' }, { status: 500 });
  }
}
