import { NextRequest, NextResponse } from 'next/server';
import { uploadIntoPath } from '@/lib/google';
import { getRole } from '@/lib/sessions';

// ⚠️ DEPRECATED: This route is limited by Vercel's ~4.5MB payload limit
// Use /api/upload/initiate + direct client upload instead
// This is kept only for backwards compatibility with small files

// Configure route for large file uploads
// Increase timeout to 5 minutes for large files
export const maxDuration = 300; // 5 minutes (Vercel Pro/Enterprise allows up to 300s)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check if user is authenticated (both admin and regular users can upload)
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const publication = form.get('publication')?.toString()!;
    const client = form.get('client')?.toString()!;
    const campaign = form.get('campaign')?.toString()!;
    const file = form.get('file') as unknown as File | undefined;

    if (!publication || !client || !campaign || !file) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Warn about payload limit
    if (file.size > 4.5 * 1024 * 1024) {
      console.warn('[DEPRECATED ROUTE] File size exceeds Vercel limit. Use /api/upload/initiate instead.');
      return NextResponse.json({ 
        error: 'File too large. This endpoint is limited to ~4.5MB. Please refresh and try again.' 
      }, { status: 413 });
    }

    const res = await uploadIntoPath({ file, client, campaign, publication });
    return NextResponse.json({ ok: true, fileId: res.id });
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}