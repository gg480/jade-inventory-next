import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  const where: any = {};
  if (startDate) where.saleDate = { ...where.saleDate, gte: startDate };
  if (endDate) where.saleDate = { ...where.saleDate, lte: endDate };

  // Get all sale records with item details for margin analysis
  const sales = await db.saleRecord.findMany({
    where,
    include: {
      item: {
        include: {
          material: true,
          type: true,
        },
      },
    },
  });

  // Compute margin for each sale
  const margins: number[] = [];
  const itemMap = new Map<number, {
    itemId: number;
    name: string;
    skuCode: string;
    materialName: string;
    typeName: string;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    salesCount: number;
  }>();

  for (const sale of sales) {
    const item = sale.item;
    if (!item) continue;
    const cost = item.allocatedCost || item.costPrice || 0;
    const profit = sale.actualPrice - cost;
    const marginPct = sale.actualPrice > 0 ? (profit / sale.actualPrice) * 100 : 0;
    margins.push(marginPct);

    if (!itemMap.has(item.id)) {
      itemMap.set(item.id, {
        itemId: item.id,
        name: item.name || item.skuCode,
        skuCode: item.skuCode,
        materialName: item.material?.name || '-',
        typeName: item.type?.name || '-',
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        salesCount: 0,
      });
    }
    const entry = itemMap.get(item.id)!;
    entry.totalRevenue += sale.actualPrice;
    entry.totalCost += cost;
    entry.totalProfit += profit;
    entry.salesCount += 1;
  }

  // Margin distribution buckets: 0-10%, 10-20%, 20-30%, 30%+
  const marginDistribution = [
    { range: '0-10%', min: 0, max: 10, count: 0, totalProfit: 0 },
    { range: '10-20%', min: 10, max: 20, count: 0, totalProfit: 0 },
    { range: '20-30%', min: 20, max: 30, count: 0, totalProfit: 0 },
    { range: '30%+', min: 30, max: Infinity, count: 0, totalProfit: 0 },
  ];

  for (let i = 0; i < margins.length; i++) {
    const m = margins[i];
    const profit = sales[i].actualPrice - (sales[i].item?.allocatedCost || sales[i].item?.costPrice || 0);
    for (const bucket of marginDistribution) {
      if (m >= bucket.min && m < bucket.max) {
        bucket.count += 1;
        bucket.totalProfit += profit;
        break;
      }
    }
  }

  // Round totals in distribution
  const marginDistResult = marginDistribution.map(b => ({
    range: b.range,
    count: b.count,
    totalProfit: Math.round(b.totalProfit * 100) / 100,
  }));

  // Top 5 items by profit margin (must have at least 1 sale)
  const itemsWithMargin = Array.from(itemMap.values())
    .filter(item => item.totalRevenue > 0 && item.salesCount > 0)
    .map(item => ({
      ...item,
      totalRevenue: Math.round(item.totalRevenue * 100) / 100,
      totalCost: Math.round(item.totalCost * 100) / 100,
      totalProfit: Math.round(item.totalProfit * 100) / 100,
      margin: Math.round((item.totalProfit / item.totalRevenue) * 10000) / 100,
    }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  return NextResponse.json({
    code: 0,
    data: {
      marginDistribution: marginDistResult,
      topMarginItems: itemsWithMargin,
    },
    message: 'ok',
  });
}
