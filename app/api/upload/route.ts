import { NextRequest, NextResponse } from 'next/server';
import { uploadIntoPath } from '@/lib/google';
import { getRole } from '@/lib/sessions';


export async function POST(req: NextRequest) {
// Check if user is authenticated (both admin and regular users can upload now)
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


if (!publication || !client || !campaign || !file) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });


const res = await uploadIntoPath({ file, client, campaign, publication });
return NextResponse.json({ ok: true, fileId: res.id });
} catch (e: any) {
return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
}
}