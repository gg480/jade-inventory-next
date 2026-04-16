import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Keys that should never be exposed via API response
const SENSITIVE_KEYS = new Set(['admin_password']);

export async function GET() {
  const configs = await db.sysConfig.findMany();
  // Filter out sensitive keys from response
  const safeConfigs = configs.filter(c => !SENSITIVE_KEYS.has(c.key)).map(c => ({
    ...c,
    value: c.key === 'admin_password' ? '******' : c.value,
  }));
  return NextResponse.json({ code: 0, data: safeConfigs, message: 'ok' });
}

export async function PUT(req: Request) {
  const { key, value } = await req.json();
  if (!key || value === undefined) {
    return NextResponse.json({ code: 400, data: null, message: '缺少 key 或 value' }, { status: 400 });
  }
  try {
    const config = await db.sysConfig.update({ where: { key }, data: { value } });
    // Mask sensitive values in response
    const safeConfig = {
      ...config,
      value: SENSITIVE_KEYS.has(config.key) ? '******' : config.value,
    };
    return NextResponse.json({ code: 0, data: safeConfig, message: 'ok' });
  } catch {
    return NextResponse.json({ code: 404, data: null, message: '配置项不存在' }, { status: 404 });
  }
}
