import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  // Most expensive in-stock item
  const mostExpensive = await db.item.findFirst({
    where: { status: 'in_stock', isDeleted: false },
    orderBy: { costPrice: 'desc' },
    select: { id: true, name: true, skuCode: true, costPrice: true },
  });

  // Items created this month (purchased this month)
  const itemsCreatedThisMonth = await db.item.count({
    where: {
      purchaseDate: { gte: monthStart },
      isDeleted: false,
    },
  });

  // Pending returns (sale records that have associated returns)
  const pendingReturns = await db.saleReturn.count();

  // Gross profit margin calculation
  const monthSales = await db.saleRecord.findMany({
    where: { saleDate: { gte: monthStart } },
    include: { item: { select: { allocatedCost: true, costPrice: true } } },
  });
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.actualPrice, 0);
  const monthCost = monthSales.reduce((sum, s) => sum + (s.item?.allocatedCost || s.item?.costPrice || 0), 0);
  const monthProfit = monthRevenue - monthCost;
  const grossMargin = monthRevenue > 0 ? Math.round((monthProfit / monthRevenue) * 10000) / 100 : 0;

  // Total stock value and count for avg cost
  const inStockItems = await db.item.findMany({
    where: { status: 'in_stock', isDeleted: false },
    select: { costPrice: true, allocatedCost: true },
  });
  const totalStockValue = inStockItems.reduce((sum, i) => sum + (i.allocatedCost || i.costPrice || 0), 0);
  const totalItems = inStockItems.length;
  const avgItemCost = totalItems > 0 ? Math.round((totalStockValue / totalItems) * 100) / 100 : 0;

  return NextResponse.json({
    code: 0,
    data: {
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      avgItemCost,
      mostExpensiveItem: mostExpensive ? {
        id: mostExpensive.id,
        name: mostExpensive.name || mostExpensive.skuCode,
        costPrice: mostExpensive.costPrice,
      } : null,
      itemsCreatedThisMonth,
      pendingReturns,
      grossMargin,
      monthRevenue: Math.round(monthRevenue * 100) / 100,
      monthProfit: Math.round(monthProfit * 100) / 100,
    },
    message: 'ok',
  });
}
