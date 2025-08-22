import { NextRequest, NextResponse } from 'next/server';
import { uploadIntoPath } from '@/lib/google';
import { getRole } from '@/lib/sessions';


export async function POST(req: NextRequest) {
// Check if user is authenticated and has admin role (since they need Google Drive access)
const role = await getRole();
if (!role) {
return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
if (role !== 'admin') {
return NextResponse.json({ error: 'Upload requires admin access to Google Drive' }, { status: 403 });
}

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