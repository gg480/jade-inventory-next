import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '7');
  const agingDays = parseInt(searchParams.get('aging_days') || '90');

  const now = new Date();
  const startDate = new Date(now.getTime() - (days - 1) * 86400000);
  const startDateStr = startDate.toISOString().slice(0, 10);

  // Build array of date strings for the last N days
  const dateLabels: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    dateLabels.push(d.toISOString().slice(0, 10));
  }

  // 1. Inventory trend: count in_stock items per day (approximated by creation date)
  // Since we can't get historical counts, we approximate:
  // - Today's count is accurate
  // - Past days are estimated by subtracting items created after that day
  const currentInStock = await db.item.count({ where: { status: 'in_stock', isDeleted: false } });
  const itemsCreatedAfterStart = await db.item.findMany({
    where: { createdAt: { gte: startDate }, isDeleted: false },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  // Count items created per day in the range
  const createdPerDay = new Map<string, number>();
  for (const item of itemsCreatedAfterStart) {
    const day = item.createdAt.toISOString().slice(0, 10);
    createdPerDay.set(day, (createdPerDay.get(day) || 0) + 1);
  }

  // Estimate past inventory by subtracting items created after each day
  const totalCreatedInRange = itemsCreatedAfterStart.length;
  let cumulativeCreated = 0;
  const inventoryTrend: { day: string; value: number }[] = [];
  for (const dateStr of dateLabels) {
    cumulativeCreated += createdPerDay.get(dateStr) || 0;
    // Approximate: current count minus items created from this day forward
    const estimated = currentInStock - (totalCreatedInRange - cumulativeCreated);
    inventoryTrend.push({ day: dateStr, value: Math.max(0, estimated) });
  }

  // 2. Sales trend: actual daily revenue
  const salesInRange = await db.saleRecord.findMany({
    where: { saleDate: { gte: startDateStr } },
    select: { saleDate: true, actualPrice: true },
  });

  const revenuePerDay = new Map<string, number>();
  for (const sale of salesInRange) {
    const day = sale.saleDate.slice(0, 10);
    revenuePerDay.set(day, (revenuePerDay.get(day) || 0) + sale.actualPrice);
  }

  const salesTrend: { day: string; value: number }[] = dateLabels.map(d => ({
    day: d,
    value: Math.round((revenuePerDay.get(d) || 0) * 100) / 100,
  }));

  // 3. Stock aging trend: approximate overstock count per day
  // We'll query actual counts for a few data points to create a trend
  const agingDate = new Date(now.getTime() - agingDays * 86400000).toISOString().slice(0, 10);
  const currentOverstock = await db.item.count({
    where: { status: 'in_stock', isDeleted: false, purchaseDate: { lte: agingDate } },
  });

  // Get items that entered the aging threshold during the period
  const itemsEnteringAging = await db.item.findMany({
    where: {
      status: 'in_stock',
      isDeleted: false,
      purchaseDate: { gte: new Date(startDate.getTime() - agingDays * 86400000).toISOString().slice(0, 10), lte: agingDate },
    },
    select: { purchaseDate: true },
  });

  const agingPerDay = new Map<string, number>();
  for (const item of itemsEnteringAging) {
    // An item enters aging on the day its age exceeds agingDays
    const entryDate = new Date(new Date(item.purchaseDate).getTime() + agingDays * 86400000).toISOString().slice(0, 10);
    if (entryDate >= startDateStr) {
      agingPerDay.set(entryDate, (agingPerDay.get(entryDate) || 0) + 1);
    }
  }

  let cumulativeAging = 0;
  const agingTrend: { day: string; value: number }[] = dateLabels.map(d => {
    cumulativeAging += agingPerDay.get(d) || 0;
    return { day: d, value: Math.max(0, currentOverstock - cumulativeAging) };
  });
  // Reverse the subtraction: earlier days had fewer items that reached aging threshold
  // Actually we want: older days = currentOverstock minus items that entered aging after that day
  // So we need to count from the latest day backwards
  let cumFromEnd = 0;
  for (let i = dateLabels.length - 1; i >= 0; i--) {
    const d = dateLabels[i];
    agingTrend[i] = { day: d, value: Math.max(0, currentOverstock - cumFromEnd) };
    cumFromEnd += agingPerDay.get(d) || 0;
  }

  // 4. Batch payback trend: count paid_back batches per day
  const batchesWithPayback = await db.batch.findMany({
    where: { status: { in: ['paid_back', 'cleared'] } },
    select: { updatedAt: true, status: true },
  });

  const paybackPerDay = new Map<string, number>();
  for (const b of batchesWithPayback) {
    if (b.updatedAt) {
      const day = b.updatedAt.toISOString().slice(0, 10);
      if (day >= startDateStr) {
        paybackPerDay.set(day, (paybackPerDay.get(day) || 0) + 1);
      }
    }
  }

  const totalPaidBack = batchesWithPayback.length;
  let cumPayback = 0;
  const paybackTrend: { day: string; value: number }[] = dateLabels.map(d => {
    cumPayback += paybackPerDay.get(d) || 0;
    return { day: d, value: Math.max(0, totalPaidBack - cumPayback) };
  });
  // Same logic: earlier days had fewer paid-back batches
  // Reverse: count from latest day backwards
  let cumPaybackFromEnd = 0;
  for (let i = dateLabels.length - 1; i >= 0; i--) {
    const d = dateLabels[i];
    paybackTrend[i] = { day: d, value: Math.max(0, totalPaidBack - cumPaybackFromEnd) };
    cumPaybackFromEnd += paybackPerDay.get(d) || 0;
  }

  // Compute percentage change (first vs last day)
  function pctChange(trend: { value: number }[]): number | null {
    if (trend.length < 2) return null;
    const first = trend[0].value;
    const last = trend[trend.length - 1].value;
    if (first === 0 && last === 0) return 0;
    if (first === 0) return last > 0 ? 100 : null;
    return Math.round(((last - first) / first) * 10000) / 100;
  }

  return NextResponse.json({
    code: 0,
    data: {
      inventory: { trend: inventoryTrend, change: pctChange(inventoryTrend) },
      sales: { trend: salesTrend, change: pctChange(salesTrend) },
      aging: { trend: agingTrend, change: pctChange(agingTrend) },
      payback: { trend: paybackTrend, change: pctChange(paybackTrend) },
    },
    message: 'ok',
  });
}
