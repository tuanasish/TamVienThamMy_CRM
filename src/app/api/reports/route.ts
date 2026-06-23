import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "month";

    // Run all 3 queries in parallel
    const [invoices, unpaidSchedules, usageLogs] = await Promise.all([
      // 1. Invoices — only need finalAmount, bankFee, staffId + staff name
      db.invoice.findMany({
        select: {
          finalAmount: true,
          bankFee: true,
          staffId: true,
          staff: { select: { fullName: true } },
        },
      }),

      // 2. Unpaid installments — only need amount + customer info
      db.installmentSchedule.findMany({
        where: { status: "pending" },
        select: {
          amount: true,
          invoice: {
            select: {
              customerId: true,
              customer: { select: { fullName: true, phone: true } },
            },
          },
        },
      }),

      // 3. Usage logs — only need service price
      db.usageLog.findMany({
        select: {
          service: { select: { price: true } },
        },
      }),
    ]);

    let totalRevenue = 0;
    let totalBankFee = 0;
    const saleDoanhSo: Record<string, { staffName: string; totalSales: number; target: number }> = {};

    invoices.forEach((inv) => {
      const finalAmt = Number(inv.finalAmount);
      const fee = Number(inv.bankFee);
      totalRevenue += finalAmt;
      totalBankFee += fee;

      if (inv.staffId) {
        if (!saleDoanhSo[inv.staffId]) {
          saleDoanhSo[inv.staffId] = {
            staffName: inv.staff.fullName,
            totalSales: 0,
            target: 30000000,
          };
        }
        saleDoanhSo[inv.staffId].totalSales += finalAmt;
      }
    });

    let totalDebt = 0;
    const customerDebts: Record<string, { customerName: string; phone: string; debtAmount: number }> = {};

    unpaidSchedules.forEach((sch) => {
      const amt = Number(sch.amount);
      totalDebt += amt;

      const customerId = sch.invoice.customerId;
      if (!customerDebts[customerId]) {
        customerDebts[customerId] = {
          customerName: sch.invoice.customer.fullName,
          phone: sch.invoice.customer.phone,
          debtAmount: 0,
        };
      }
      customerDebts[customerId].debtAmount += amt;
    });

    let totalServiceCost = 0;
    usageLogs.forEach((log) => {
      totalServiceCost += Number(log.service.price) * 0.3;
    });

    const salesLeaderboard = Object.values(saleDoanhSo).sort((a, b) => b.totalSales - a.totalSales);
    const debtsList = Object.values(customerDebts).sort((a, b) => b.debtAmount - a.debtAmount);

    return NextResponse.json({
      revenueSummary: {
        totalRevenue,
        totalBankFee,
        totalServiceCost,
        netProfit: totalRevenue - totalBankFee - totalServiceCost,
      },
      salesLeaderboard,
      debts: {
        totalDebt,
        list: debtsList,
      },
    });
  } catch (error: any) {
    console.error("GET Reports Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi tải báo cáo" }, { status: 500 });
  }
}
