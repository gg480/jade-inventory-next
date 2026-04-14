import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agingDays = parseInt(searchParams.get('aging_days') || '90');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  // Total items in stock
  const totalItems = await db.item.count({ where: { status: 'in_stock', isDeleted: false } });

  // Total stock value
  const inStockItems = await db.item.findMany({
    where: { status: 'in_stock', isDeleted: false },
    select: { costPrice: true, allocatedCost: true },
  });
  const totalStockValue = inStockItems.reduce((sum, i) => sum + (i.allocatedCost || i.costPrice || 0), 0);

  // Month sales
  const monthSales = await db.saleRecord.findMany({
    where: { saleDate: { gte: monthStart } },
    include: { item: true },
  });
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.actualPrice, 0);
  const monthProfit = monthSales.reduce((sum, s) => {
    const cost = s.item?.allocatedCost || s.item?.costPrice || 0;
    return sum + (s.actualPrice - cost);
  }, 0);
  const monthSoldCount = monthSales.length;

  // Today's sales (lightweight count for QuickStatsBar)
  const todaySales = await db.saleRecord.findMany({
    where: { saleDate: { gte: todayStr } },
    select: { actualPrice: true },
  });
  const todaySalesCount = todaySales.length;
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.actualPrice, 0);

  // Stock aging count
  const agingDate = new Date(now.getTime() - agingDays * 86400000).toISOString().slice(0, 10);
  const overstockCount = await db.item.count({
    where: { status: 'in_stock', isDeleted: false, purchaseDate: { lte: agingDate } },
  });

  // Batch payback info
  const batches = await db.batch.findMany({
    include: { items: { where: { isDeleted: false }, select: { status: true, allocatedCost: true } } },
  });
  let totalBatchCost = 0;
  let totalBatchPayback = 0;
  let incompleteBatches = 0;
  for (const b of batches) {
    totalBatchCost += b.totalCost || 0;
    const sold = b.items.filter(i => i.status === 'sold');
    totalBatchPayback += sold.reduce((sum, i) => sum + (i.allocatedCost || 0), 0);
    if (b.items.length < b.quantity) incompleteBatches++;
  }

  return NextResponse.json({
    code: 0,
    data: {
      totalItems,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      monthRevenue: Math.round(monthRevenue * 100) / 100,
      monthProfit: Math.round(monthProfit * 100) / 100,
      monthSoldCount,
      todaySales: todaySalesCount,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      overstockCount,
      batchPaybackRate: totalBatchCost > 0 ? Math.round(totalBatchPayback / totalBatchCost * 10000) / 100 : 0,
      incompleteBatches,
    },
    message: 'ok',
  });
}
