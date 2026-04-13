import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

async function generateCustomerCode(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `cst${today}`;
  const last = await db.customer.findFirst({
    where: { customerCode: { startsWith: prefix } },
    orderBy: { customerCode: 'desc' },
  });
  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.customerCode.slice(-3));
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const size = parseInt(searchParams.get('size') || '20');
  const keyword = searchParams.get('keyword');

  const where: any = { isActive: true };
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { phone: { contains: keyword } },
      { wechat: { contains: keyword } },
    ];
  }

  const total = await db.customer.count({ where });
  const items = await db.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * size,
    take: size,
  });

  return NextResponse.json({
    code: 0,
    data: { items, pagination: { total, page, size, pages: Math.ceil(total / size) } },
    message: 'ok',
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, phone, wechat, notes } = body;
  try {
    const customerCode = await generateCustomerCode();
    const customer = await db.customer.create({
      data: { customerCode, name, phone, wechat, notes },
    });
    return NextResponse.json({ code: 0, data: customer, message: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: '创建失败' }, { status: 500 });
  }
}
