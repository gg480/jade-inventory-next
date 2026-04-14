import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logAction } from '@/lib/log';

// PATCH /api/sales/payment - Update payment status for a sale record
export async function PATCH(req: Request) {
  try {
    const { saleId, paymentStatus, paymentMethod } = await req.json();

    if (!saleId) {
      return NextResponse.json({ code: 400, data: null, message: '缺少销售记录ID' }, { status: 400 });
    }

    const validStatuses = ['paid', 'pending', 'partial', 'overdue'];
    if (paymentStatus && !validStatuses.includes(paymentStatus)) {
      return NextResponse.json({ code: 400, data: null, message: `无效的付款状态，可选: ${validStatuses.join('/')}` }, { status: 400 });
    }

    const validMethods = ['cash', 'transfer', 'wechat', 'alipay', 'installment'];
    if (paymentMethod && !validMethods.includes(paymentMethod)) {
      return NextResponse.json({ code: 400, data: null, message: `无效的付款方式，可选: ${validMethods.join('/')}` }, { status: 400 });
    }

    const existing = await db.saleRecord.findUnique({ where: { id: saleId } });
    if (!existing) {
      return NextResponse.json({ code: 404, data: null, message: '销售记录不存在' }, { status: 404 });
    }

    const updateData: any = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    const record = await db.saleRecord.update({
      where: { id: saleId },
      data: updateData,
    });

    await logAction('update_payment', 'sale', saleId, {
      saleNo: existing.saleNo,
      oldStatus: existing.paymentStatus,
      newStatus: paymentStatus || existing.paymentStatus,
      method: paymentMethod || existing.paymentMethod,
    });

    return NextResponse.json({ code: 0, data: record, message: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: `更新失败: ${e.message}` }, { status: 500 });
  }
}

// GET /api/sales/payment - Get payment summary/stats
export async function GET() {
  try {
    const [total, paid, pending, partial, overdue] = await Promise.all([
      db.saleRecord.count(),
      db.saleRecord.count({ where: { paymentStatus: 'paid' } }),
      db.saleRecord.count({ where: { paymentStatus: 'pending' } }),
      db.saleRecord.count({ where: { paymentStatus: 'partial' } }),
      db.saleRecord.count({ where: { paymentStatus: 'overdue' } }),
    ]);

    // Pending/overdue amounts
    const pendingRecords = await db.saleRecord.findMany({
      where: { paymentStatus: { in: ['pending', 'partial', 'overdue'] } },
      select: { actualPrice: true, paymentStatus: true },
    });
    const pendingAmount = pendingRecords
      .filter(r => r.paymentStatus === 'pending')
      .reduce((sum, r) => sum + r.actualPrice, 0);
    const overdueAmount = pendingRecords
      .filter(r => r.paymentStatus === 'overdue')
      .reduce((sum, r) => sum + r.actualPrice, 0);

    // Payment method distribution
    const methodDist = await db.saleRecord.groupBy({
      by: ['paymentMethod'],
      _count: { id: true },
      _sum: { actualPrice: true },
      where: { paymentMethod: { not: null } },
    });

    return NextResponse.json({
      code: 0,
      data: {
        total,
        paid,
        pending,
        partial,
        overdue,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        methodDistribution: methodDist.map(m => ({
          method: m.paymentMethod,
          count: m._count.id,
          total: Math.round((m._sum.actualPrice || 0) * 100) / 100,
        })),
      },
      message: 'ok',
    });
  } catch (e: any) {
    return NextResponse.json({ code: 500, data: null, message: e.message }, { status: 500 });
  }
}
