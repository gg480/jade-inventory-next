import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/items/batch — Batch create items
export async function POST(req: Request) {
  const body = await req.json();
  const { materialId, typeId, supplierId, skuPrefix, quantity, batchCode, costPrice, sellingPrice, weight, size, purchaseDate, tagIds } = body;

  try {
    const material = await db.dictMaterial.findUnique({ where: { id: materialId } });
    const prefix = skuPrefix || (material ? material.name.slice(0, 2) : 'XX');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const created = [];
    for (let i = 0; i < quantity; i++) {
      const seq = String(i + 1).padStart(3, '0');
      const skuCode = `${prefix}-${dateStr}-${seq}`;

      const item = await db.item.create({
        data: {
          skuCode,
          batchCode,
          materialId,
          typeId,
          costPrice: costPrice || null,
          sellingPrice,
          origin: material?.origin,
          supplierId,
          purchaseDate,
          status: 'in_stock',
          ...(tagIds?.length ? { tags: { connect: tagIds.map((id: number) => ({ id })) } } : {}),
          ...(weight || size ? { spec: { create: { weight, size } } } : {}),
        },
      });
      created.push(item);
    }

    return NextResponse.json({ code: 0, data: { created: created.length, items: created }, message: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: `批量创建失败: ${e.message}` }, { status: 500 });
  }
}
