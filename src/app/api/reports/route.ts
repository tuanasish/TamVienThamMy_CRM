import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "month"; // 'day', 'week', 'month', 'year'

    // 1. Fetch Invoices and group by date
    const invoices = await db.invoice.findMany({
      include: { staff: true },
    });

    const now = new Date();
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
            target: 30000000, // Default target 30M
          };
        }
        saleDoanhSo[inv.staffId].totalSales += finalAmt;
      }
    });

    // 2. Calculate Unpaid Installments (Tiền nợ)
    const unpaidSchedules = await db.installmentSchedule.findMany({
      where: { status: "pending" },
      include: {
        invoice: {
          include: { customer: true },
        },
      },
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

    // 3. Calculate Service Cost (Chi phí cost - let's assume 30% of service prices as material/cost of service)
    const usageLogs = await db.usageLog.findMany({
      include: { service: true },
    });
    
    let totalServiceCost = 0;
    usageLogs.forEach((log) => {
      const price = Number(log.service.price);
      // Simulate cost of cosmetics/operation as 30% of service price
      totalServiceCost += price * 0.3;
    });

    // Group sales leaderboard
    const salesLeaderboard = Object.values(saleDoanhSo).sort((a, b) => b.totalSales - a.totalSales);
    const debtsList = Object.values(customerDebts).sort((a, b) => b.debtAmount - a.debtAmount);

    return NextResponse.json({
      revenueSummary: {
        totalRevenue,
        totalBankFee, // Chi phí trả góp
        totalServiceCost, // Chi phí cost dịch vụ
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
