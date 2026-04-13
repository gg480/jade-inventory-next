import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const size = parseInt(searchParams.get('size') || '20');
  const materialId = searchParams.get('material_id');
  const typeId = searchParams.get('type_id');
  const status = searchParams.get('status');
  const batchId = searchParams.get('batch_id');
  const counter = searchParams.get('counter');
  const keyword = searchParams.get('keyword');

  const where: any = { isDeleted: false };
  if (materialId) where.materialId = parseInt(materialId);
  if (typeId) where.typeId = parseInt(typeId);
  if (status) where.status = status;
  if (batchId) where.batchId = parseInt(batchId);
  if (counter) where.counter = parseInt(counter);
  if (keyword) {
    where.OR = [
      { skuCode: { contains: keyword } },
      { name: { contains: keyword } },
      { certNo: { contains: keyword } },
      { notes: { contains: keyword } },
    ];
  }

  const total = await db.item.count({ where });
  const items = await db.item.findMany({
    where,
    include: {
      material: true,
      type: true,
      spec: true,
      tags: true,
      images: { where: { isCover: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * size,
    take: size,
  });

  const today = new Date();
  const itemsWithExtras = items.map(item => {
    const ageDays = item.purchaseDate
      ? Math.floor((today.getTime() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      ...item,
      materialName: item.material?.name,
      typeName: item.type?.name,
      ageDays,
      coverImage: item.images[0]?.filename || null,
    };
  });

  return NextResponse.json({
    code: 0,
    data: {
      items: itemsWithExtras,
      pagination: { total, page, size, pages: Math.ceil(total / size) },
    },
    message: 'ok',
  });
}

// Auto-generate SKU code
async function generateSkuCode(materialId: number): Promise<string> {
  const material = await db.dictMaterial.findUnique({ where: { id: materialId } });
  const prefix = material ? material.name.slice(0, 2) : 'XX';
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefixFull = `${prefix}-${dateStr}-`;

  // Find the latest SKU with this prefix
  const lastItem = await db.item.findFirst({
    where: { skuCode: { startsWith: prefixFull } },
    orderBy: { skuCode: 'desc' },
  });

  let seq = 1;
  if (lastItem) {
    const parts = lastItem.skuCode.split('-');
    const lastSeq = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefixFull}${String(seq).padStart(3, '0')}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { skuCode, name, batchId, materialId, typeId, costPrice, sellingPrice, floorPrice, origin, counter, certNo, notes, supplierId, purchaseDate, tagIds, spec } = body;

  try {
    // Auto-generate SKU if not provided
    const finalSkuCode = skuCode || await generateSkuCode(materialId);

    // For high-value items (no batch), allocatedCost = costPrice
    const allocatedCost = !batchId && costPrice ? costPrice : null;

    const item = await db.item.create({
      data: {
        skuCode: finalSkuCode,
        name,
        batchCode: batchId ? (await db.batch.findUnique({ where: { id: batchId } }))?.batchCode : null,
        batchId,
        materialId,
        typeId,
        costPrice,
        allocatedCost,
        sellingPrice,
        floorPrice,
        origin,
        counter,
        certNo,
        notes,
        supplierId,
        purchaseDate,
        status: 'in_stock',
        ...(tagIds?.length ? {
          tags: { connect: tagIds.map((id: number) => ({ id })) },
        } : {}),
        ...(spec ? {
          spec: { create: spec },
        } : {}),
      },
      include: { material: true, type: true, spec: true, tags: true },
    });

    return NextResponse.json({ code: 0, data: item, message: 'ok' });
  } catch (e: any) {
    if (e.message?.includes('Unique')) {
      return NextResponse.json({ code: 400, data: null, message: 'SKU编号已存在' }, { status: 400 });
    }
    return NextResponse.json({ code: 500, data: null, message: `创建失败: ${e.message}` }, { status: 500 });
  }
}
