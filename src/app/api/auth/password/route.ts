import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateToken } from '@/lib/auth';

const DEFAULT_PASSWORD = 'admin123';

async function getAdminPassword(): Promise<string> {
  try {
    const config = await db.sysConfig.findUnique({ where: { key: 'admin_password' } });
    return config?.value || DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

// PUT /api/auth/password — change admin password
export async function PUT(req: Request) {
  try {
    // Validate auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token || !await validateToken(token)) {
      return NextResponse.json({ code: 401, data: null, message: '未登录或会话已过期' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ code: 400, data: null, message: '请输入当前密码和新密码' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ code: 400, data: null, message: '新密码长度不能少于6位' }, { status: 400 });
    }

    const adminPassword = await getAdminPassword();
    if (currentPassword !== adminPassword) {
      return NextResponse.json({ code: 401, data: null, message: '当前密码错误' }, { status: 401 });
    }

    if (newPassword === currentPassword) {
      return NextResponse.json({ code: 400, data: null, message: '新密码不能与当前密码相同' }, { status: 400 });
    }

    // Update password in SysConfig
    await db.sysConfig.upsert({
      where: { key: 'admin_password' },
      update: { value: newPassword },
      create: { key: 'admin_password', value: newPassword, description: '管理员密码' },
    });

    return NextResponse.json({
      code: 0,
      data: null,
      message: '密码修改成功',
    });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: e.message }, { status: 500 });
  }
}
