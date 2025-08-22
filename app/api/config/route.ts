import { NextRequest, NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/configStore';
import { z } from 'zod';
import { getRole } from '@/lib/sessions';

const ConfigSchema = z.object({
  clients: z.array(z.string()),
  campaigns: z.array(z.string()),
  publications: z.array(z.string()),
});

export async function GET() {
  try {
    const json = await readConfig();
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Read failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const role = await getRole();
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = ConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    await writeConfig(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Write failed' }, { status: 500 });
  }
}
