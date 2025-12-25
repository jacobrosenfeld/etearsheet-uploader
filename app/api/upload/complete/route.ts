import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { verifyUploadCompletion, findRecentUpload } from '@/lib/google';

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
    const { fileId, fileName, client, campaign, publication } = body;

    let fileMetadata;
    
    if (fileId && fileId !== 'uploaded') {
      // We have a file ID, verify it directly
      fileMetadata = await verifyUploadCompletion(fileId);
    } else if (fileName && client && campaign && publication) {
      // No file ID, need to find the file by name in the target folder
      fileMetadata = await findRecentUpload({
        fileName,
        client,
        campaign,
        publication
      });
    } else {
      return NextResponse.json({ error: 'Missing fileId or file location details' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, file: fileMetadata });
  } catch (e: any) {
    console.error('Error verifying upload:', e);
    return NextResponse.json({ error: e?.message || 'Failed to verify upload' }, { status: 500 });
  }
}
