import { NextRequest, NextResponse } from 'next/server';
import { uploadIntoPath } from '@/lib/google';


export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const publication = form.get('publication')?.toString()!;
    const client = form.get('client')?.toString()!;
    const campaign = form.get('campaign')?.toString()!;
    const file = form.get('file') as unknown as File | undefined;

    if (!publication || !client || !campaign || !file) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const res = await uploadIntoPath({ file, client, campaign, publication });
    return NextResponse.json({ ok: true, fileId: res.id });
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}