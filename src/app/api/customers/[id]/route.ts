import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id: parseInt(id) },
    include: { saleRecords: { include: { item: true } } },
  });
  if (!customer) return NextResponse.json({ code: 404, data: null, message: '未找到' }, { status: 404 });
  return NextResponse.json({ code: 0, data: customer, message: 'ok' });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    const customer = await db.customer.update({ where: { id: parseInt(id) }, data: body });
    return NextResponse.json({ code: 0, data: customer, message: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: '更新失败' }, { status: 500 });
  }
}
