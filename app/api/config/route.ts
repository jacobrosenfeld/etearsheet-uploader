import { NextRequest, NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/configStore';
import { getRole } from '@/lib/sessions';
import { z } from 'zod';

const ConfigSchema = z.object({
  clients: z.array(z.string()),
  campaigns: z.array(z.string()),
  publications: z.array(z.string()),
});

export async function GET() {
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const json = await readConfig();
    return NextResponse.json(json);
  } catch (e: any) {
    // Return default empty config if not set up yet
    return NextResponse.json({ 
      clients: [],
      campaigns: [],
      publications: [],
      driveSettings: {
        isConfigured: false,
        rootFolderName: 'JJA eTearsheets',
        rootFolderId: undefined
      }
    });
  }
}

export async function PUT(req: NextRequest) {
  const role = await getRole();
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

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
