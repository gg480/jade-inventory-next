import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateToken, hashPassword, verifyPassword, parseStoredPassword, formatStoredPassword } from '@/lib/auth';

/**
 * Verify current password — supports both hashed and legacy plaintext
 */
async function verifyCurrentPassword(inputPassword: string): Promise<boolean> {
  try {
    const config = await db.sysConfig.findUnique({ where: { key: 'admin_password' } });
    if (!config?.value) return false;

    const stored = config.value;
    const parsed = parseStoredPassword(stored);

    if (parsed) {
      return verifyPassword(inputPassword, parsed.hash, parsed.salt);
    } else {
      // Legacy plaintext
      return inputPassword === stored;
    }
  } catch {
    return false;
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

    const isValid = await verifyCurrentPassword(currentPassword);
    if (!isValid) {
      return NextResponse.json({ code: 401, data: null, message: '当前密码错误' }, { status: 401 });
    }

    if (newPassword === currentPassword) {
      return NextResponse.json({ code: 400, data: null, message: '新密码不能与当前密码相同' }, { status: 400 });
    }

    // Hash and store new password
    const { salt, hash } = hashPassword(newPassword);
    await db.sysConfig.upsert({
      where: { key: 'admin_password' },
      update: { value: formatStoredPassword(salt, hash) },
      create: { key: 'admin_password', value: formatStoredPassword(salt, hash), description: '管理员密码(哈希)' },
    });

    return NextResponse.json({
      code: 0,
      data: null,
      message: '密码修改成功',
    });
  } catch {
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
