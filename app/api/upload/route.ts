import { NextRequest, NextResponse } from 'next/server';
import { uploadIntoPath } from '@/lib/google';


export async function POST(req: NextRequest) {
try {
const form = await req.formData();
const publication = form.get('publication')?.toString()!;
const client = form.get('client')?.toString()!;
const campaign = form.get('campaign')?.toString()!;
const date = form.get('date')?.toString()!; // YYYY-MM-DD
const file = form.get('file') as unknown as File | undefined;


if (!publication || !client || !campaign || !date || !file) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });


// date folder: keep ISO date or transform if needed
const dateFolder = date;


const res = await uploadIntoPath({ file, client, campaign, publication, dateFolder });
return NextResponse.json({ ok: true, fileId: res.id });
} catch (e: any) {
return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
}
}