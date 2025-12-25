import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { uploadChunkToGoogleDrive, finalizeChunkedUpload } from '@/lib/google';

// This endpoint receives file chunks and uploads them to Google Drive
// Supports chunked uploads to bypass Vercel's 4.5MB limit
export const maxDuration = 300; // 5 minutes for large files
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check if user is authenticated
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const uploadUrl = formData.get('uploadUrl')?.toString();
    const chunk = formData.get('chunk') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex')?.toString() || '0');
    const totalChunks = parseInt(formData.get('totalChunks')?.toString() || '1');
    const isLastChunk = chunkIndex === totalChunks - 1;

    if (!uploadUrl || !chunk) {
      return NextResponse.json({ error: 'Missing uploadUrl or chunk' }, { status: 400 });
    }

    // Upload chunk to Google Drive
    const result = await uploadChunkToGoogleDrive({
      uploadUrl,
      chunk,
      chunkIndex,
      totalChunks,
      isLastChunk
    });

    if (isLastChunk && result.file) {
      // Last chunk uploaded successfully, return file metadata
      return NextResponse.json({ ok: true, file: result.file, complete: true });
    } else {
      // Chunk uploaded, but more chunks to come
      return NextResponse.json({ ok: true, complete: false, chunkIndex });
    }
  } catch (e: any) {
    console.error('Error uploading chunk to Google Drive:', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
