import { NextRequest, NextResponse } from 'next/server';
import { readConfigJSON, writeConfigJSON } from '@/lib/google';
import { getRole } from '@/lib/session';
import { z } from 'zod';


export async function GET() {
try {
const { json } = await readConfigJSON();
return NextResponse.json(json);
} catch (e) {
return NextResponse.json({ error: 'Auth required' }, { status: 401 });
}
}


const ConfigSchema = z.object({
clients: z.array(z.string()),
campaigns: z.array(z.string()),
publications: z.array(z.string()),
});


export async function PUT(req: NextRequest) {
const role = await getRole();
if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const body = await req.json();
const parsed = ConfigSchema.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
await writeConfigJSON(parsed.data);
return NextResponse.json({ ok: true });
}