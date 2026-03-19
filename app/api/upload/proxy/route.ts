import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { uploadChunkToGoogleDrive, finalizeChunkedUpload } from '@/lib/google';

// This endpoint receives file chunks and uploads them to Google Drive.
// Chunks up to 4MB are accepted; with ~2KB form overhead this stays under Vercel's 4.5MB limit.
// The bodySizeLimit in next.config.js applies to Server Actions only, not API routes.
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

    // Reject chunks that would push the total request over Vercel's 4.5MB platform limit.
    // 4MB data + ~2KB form overhead is safe; anything larger risks a 413 from the platform.
    if (chunk.size > 4.2 * 1024 * 1024) {
      console.error(`[Proxy] Chunk too large: ${chunk.size} bytes`);
      return NextResponse.json({
        error: `Chunk size ${chunk.size} bytes exceeds the 4MB limit.`
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
