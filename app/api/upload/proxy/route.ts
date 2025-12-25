import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { uploadFileToGoogleDrive } from '@/lib/google';

// This endpoint receives the file data and uploads it to Google Drive
// This acts as a proxy to avoid CORS issues
export const maxDuration = 300; // 5 minutes for large files
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check if user is authenticated
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get the upload URL and file from request
    const formData = await req.formData();
    const uploadUrl = formData.get('uploadUrl')?.toString();
    const file = formData.get('file') as File;

    if (!uploadUrl || !file) {
      return NextResponse.json({ error: 'Missing uploadUrl or file' }, { status: 400 });
    }

    // Upload the file to Google Drive using the upload URL
    const fileMetadata = await uploadFileToGoogleDrive(uploadUrl, file);

    return NextResponse.json({ ok: true, file: fileMetadata });
  } catch (e: any) {
    console.error('Error uploading to Google Drive:', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
