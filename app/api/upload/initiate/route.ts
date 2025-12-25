import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { initiateResumableUpload } from '@/lib/google';

// This endpoint creates a Google Drive resumable upload session
// and returns the upload URL to the client.
// The client will then upload the file directly to Google Drive.
export const maxDuration = 60; // 1 minute should be enough for metadata operations
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check if user is authenticated
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { publication, client, campaign, fileName, fileSize, mimeType } = body;

    if (!publication || !client || !campaign || !fileName || !fileSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the upload session on Google Drive and get the upload URL
    const uploadUrl = await initiateResumableUpload({
      client,
      campaign,
      publication,
      fileName,
      fileSize,
      mimeType: mimeType || 'application/octet-stream'
    });

    return NextResponse.json({ uploadUrl });
  } catch (e: any) {
    console.error('Error initiating upload:', e);
    return NextResponse.json({ error: e?.message || 'Failed to initiate upload' }, { status: 500 });
  }
}
