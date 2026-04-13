import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.item.findUnique({
    where: { id: parseInt(id) },
    include: {
      material: true,
      type: true,
      batch: { include: { material: true, supplier: true } },
      supplier: true,
      spec: true,
      tags: true,
      images: true,
      saleRecords: { include: { customer: true } },
    },
  });
  if (!item || item.isDeleted) {
    return NextResponse.json({ code: 404, data: null, message: '未找到' }, { status: 404 });
  }

  const today = new Date();
  const ageDays = item.purchaseDate
    ? Math.floor((today.getTime() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return NextResponse.json({
    code: 0,
    data: {
      ...item,
      materialName: item.material?.name,
      typeName: item.type?.name,
      supplierName: item.supplier?.name,
      ageDays,
      coverImage: item.images.find(i => i.isCover)?.filename || item.images[0]?.filename || null,
    },
    message: 'ok',
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { tagIds, spec, ...data } = body;

  try {
    // Update tags if provided
    if (tagIds !== undefined) {
      await db.itemTag.deleteMany({ where: { itemId: parseInt(id) } });
      if (tagIds.length > 0) {
        await db.itemTag.createMany({ data: tagIds.map((tid: number) => ({ itemId: parseInt(id), tagId: tid })) });
      }
    }

    // Update spec if provided
    if (spec) {
      await db.itemSpec.upsert({
        where: { itemId: parseInt(id) },
        update: spec,
        create: { itemId: parseInt(id), ...spec },
      });
    }

    const item = await db.item.update({
      where: { id: parseInt(id) },
      data,
      include: { material: true, type: true, spec: true, tags: true },
    });

    return NextResponse.json({ code: 0, data: item, message: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: `更新失败: ${e.message}` }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.item.update({ where: { id: parseInt(id) }, data: { isDeleted: true } });
    return NextResponse.json({ code: 0, data: null, message: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: '删除失败' }, { status: 500 });
  }
}
