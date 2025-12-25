import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { uploadChunkToGoogleDrive, finalizeChunkedUpload } from '@/lib/google';

// This endpoint receives file chunks and uploads them to Google Drive
// Supports chunked uploads to bypass Vercel's 4.5MB limit
// Each chunk must be <3MB to ensure we stay under Vercel's limit with overhead
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
    const startByte = parseInt(formData.get('startByte')?.toString() || '0');
    const endByte = parseInt(formData.get('endByte')?.toString() || '0');
    const totalSize = parseInt(formData.get('totalSize')?.toString() || '0');
    const isLastChunk = chunkIndex === totalChunks - 1;

    if (!uploadUrl || !chunk) {
      return NextResponse.json({ error: 'Missing uploadUrl or chunk' }, { status: 400 });
    }

    console.log(`[Proxy] Receiving chunk ${chunkIndex + 1}/${totalChunks}, bytes ${startByte}-${endByte}, size: ${chunk.size} bytes`);

    // Verify chunk size is reasonable (<3MB to avoid Vercel limit)
    if (chunk.size > 3 * 1024 * 1024) {
      console.error(`[Proxy] Chunk too large: ${chunk.size} bytes`);
      return NextResponse.json({ 
        error: `Chunk size ${chunk.size} bytes exceeds 3MB limit. Use smaller chunks.` 
      }, { status: 413 });
    }

    // Upload chunk to Google Drive
    const result = await uploadChunkToGoogleDrive({
      uploadUrl,
      chunk,
      chunkIndex,
      totalChunks,
      startByte,
      endByte,
      totalSize,
      isLastChunk
    });

    if (isLastChunk && result.file) {
      // Last chunk uploaded successfully, return file metadata
      console.log(`[Proxy] Upload complete: ${result.file.id}`);
      return NextResponse.json({ ok: true, file: result.file, complete: true });
    } else {
      // Chunk uploaded, but more chunks to come
      console.log(`[Proxy] Chunk ${chunkIndex + 1} uploaded successfully`);
      return NextResponse.json({ ok: true, complete: false, chunkIndex });
    }
  } catch (e: any) {
    console.error('[Proxy] Error uploading chunk:', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
