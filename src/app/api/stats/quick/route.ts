import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Lightweight stats API for QuickStatsBar - avoids fetching full sales lists
export async function GET() {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    const [inStockCount, todaySalesData, monthSalesData, pendingBatches] = await Promise.all([
      // In-stock item count
      db.item.count({ where: { status: 'in_stock', isDeleted: false } }),
      // Today's sales (lightweight - only select actualPrice)
      db.saleRecord.findMany({
        where: { saleDate: { gte: todayStr } },
        select: { actualPrice: true },
      }),
      // Month sales summary
      db.saleRecord.findMany({
        where: { saleDate: { gte: monthStart } },
        select: { actualPrice: true },
      }),
      // Batches with incomplete items
      db.batch.findMany({
        include: { _count: { select: { items: { where: { isDeleted: false } } } } },
      }),
    ]);

    const todaySalesCount = todaySalesData.length;
    const todayRevenue = todaySalesData.reduce((sum, s) => sum + s.actualPrice, 0);
    const monthRevenue = monthSalesData.reduce((sum, s) => sum + s.actualPrice, 0);
    const incompleteBatches = pendingBatches.filter(b => (b._count?.items || 0) < b.quantity).length;

    return NextResponse.json({
      inStockCount,
      todaySalesCount,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      monthRevenue: Math.round(monthRevenue * 100) / 100,
      incompleteBatches,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
