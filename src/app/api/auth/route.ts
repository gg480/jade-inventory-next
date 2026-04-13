import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, validateToken, deleteSession } from '@/lib/auth';

const DEFAULT_PASSWORD = 'admin123';

async function getAdminPassword(): Promise<string> {
  try {
    const config = await db.sysConfig.findUnique({ where: { key: 'admin_password' } });
    return config?.value || DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

// POST /api/auth/login — authenticate with password
export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ code: 400, data: null, message: '请输入密码' }, { status: 400 });
    }

    const adminPassword = await getAdminPassword();
    if (password !== adminPassword) {
      return NextResponse.json({ code: 401, data: null, message: '密码错误' }, { status: 401 });
    }

    const token = createSession();
    return NextResponse.json({
      code: 0,
      data: { token, expiresIn: 86400 },
      message: 'ok',
    });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: e.message }, { status: 500 });
  }
}

// GET /api/auth/check — validate session
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !validateToken(token)) {
    return NextResponse.json({ code: 401, data: null, message: '未登录或会话已过期' }, { status: 401 });
  }

  return NextResponse.json({
    code: 0,
    data: { authenticated: true, user: 'admin' },
    message: 'ok',
  });
}

// DELETE /api/auth/logout — delete session
export async function DELETE(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token) {
    deleteSession(token);
  }

  return NextResponse.json({ code: 0, data: null, message: 'ok' });
}
