import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function attributeInvoiceSales(inv: any, amountPaid: number, saleDoanhSo: Record<string, { staffName: string; totalSales: number; target: number }>, allStaff: any[]) {
  const items = inv.items || [];
  if (items.length === 0) {
    if (inv.staffId) {
      if (!saleDoanhSo[inv.staffId]) {
        const staffName = inv.staff?.fullName || allStaff.find((s) => s.id === inv.staffId)?.fullName || "Nhân viên";
        saleDoanhSo[inv.staffId] = { staffName, totalSales: 0, target: 30000000 };
      }
      saleDoanhSo[inv.staffId].totalSales += amountPaid;
    }
    return;
  }

  const itemValues = items.map((it: any) => {
    const price = Number(it.price);
    const qty = Number(it.quantity || 1);
    const disc = Number(it.discount || 0);
    return Math.max(0, (price * qty) - disc);
  });
  const totalItemValues = itemValues.reduce((sum: number, v: number) => sum + v, 0);

  if (totalItemValues === 0) {
    if (inv.staffId) {
      if (!saleDoanhSo[inv.staffId]) {
        const staffName = inv.staff?.fullName || allStaff.find((s) => s.id === inv.staffId)?.fullName || "Nhân viên";
        saleDoanhSo[inv.staffId] = { staffName, totalSales: 0, target: 30000000 };
      }
      saleDoanhSo[inv.staffId].totalSales += amountPaid;
    }
    return;
  }

  items.forEach((it: any, idx: number) => {
    const itemVal = itemValues[idx];
    const itemShare = (itemVal / totalItemValues) * amountPaid;

    let selectedStaffIds: string[] = [];
    try {
      if (Array.isArray(it.saleStaffIds)) {
        selectedStaffIds = it.saleStaffIds;
      } else if (typeof it.saleStaffIds === "string") {
        selectedStaffIds = JSON.parse(it.saleStaffIds);
      }
    } catch (e) {}

    if (selectedStaffIds.length === 0) {
      const fallbackId = it.staffId || inv.staffId;
      if (fallbackId) {
        selectedStaffIds = [fallbackId];
      }
    }

    if (selectedStaffIds.length > 0) {
      const splitShare = itemShare / selectedStaffIds.length;
      selectedStaffIds.forEach((staffId) => {
        if (!saleDoanhSo[staffId]) {
          const staffName = allStaff.find((s) => s.id === staffId)?.fullName || "Nhân viên";
          saleDoanhSo[staffId] = { staffName, totalSales: 0, target: 30000000 };
        }
        saleDoanhSo[staffId].totalSales += splitShare;
      });
    }
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "month"; // 'day', 'week', 'month', 'year', 'custom'
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate = new Date();
    let endDate = new Date();

    if (filter === "day") {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === "week") {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === "month") {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === "year") {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === "custom" && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to current month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Run queries in parallel
    const [invoices, unpaidSchedules, paidSchedules, usageLogs, allStaff] = await Promise.all([
      // 1. Invoices in date range
      db.invoice.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          paymentType: true,
          installmentType: true,
          finalAmount: true,
          bankFee: true,
          staffId: true,
          staff: { select: { fullName: true } },
          schedules: {
            select: {
              amount: true,
            },
          },
          items: true,
        },
      }),

      // 2. All unpaid installments (current outstanding Spa debt)
      db.installmentSchedule.findMany({
        where: {
          status: "pending",
          invoice: {
            installmentType: "counter",
          },
        },
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

      // 3. Paid installments in date range (realized revenue)
      db.installmentSchedule.findMany({
        where: {
          status: "paid",
          paidAt: {
            gte: startDate,
            lte: endDate,
          },
          invoice: {
            installmentType: "counter",
          },
        },
        select: {
          amount: true,
          invoice: {
            select: {
              staffId: true,
              staff: { select: { fullName: true } },
              items: true,
            },
          },
        },
      }),

      // 4. Usage logs in date range (operational costs)
      db.usageLog.findMany({
        where: {
          usedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          service: { select: { price: true } },
        },
      }),

      // 5. Staff list
      db.staff.findMany(),
    ]);

    let totalRevenue = 0;
    let totalBankFee = 0;
    const saleDoanhSo: Record<string, { staffName: string; totalSales: number; target: number }> = {};

    // Calculate revenue from core invoices
    invoices.forEach((inv) => {
      const finalAmt = Number(inv.finalAmount);
      const fee = Number(inv.bankFee);
      totalBankFee += fee;

      let invRevenue = 0;
      if (inv.paymentType === "installment") {
        if (inv.installmentType === "counter") {
          const totalDebt = inv.schedules.reduce((sum, sch) => sum + Number(sch.amount), 0);
          // Down payment = finalAmount - total installment debt
          invRevenue = Math.max(0, finalAmt - totalDebt);
        } else {
          invRevenue = finalAmt; // Home Credit / Mirae Asset pays full amount immediately
        }
      } else {
        invRevenue = finalAmt;
      }

      totalRevenue += invRevenue;

      attributeInvoiceSales(inv, invRevenue, saleDoanhSo, allStaff);
    });

    // Add revenue from paid installments in this period
    paidSchedules.forEach((sch) => {
      const amt = Number(sch.amount);
      totalRevenue += amt;

      attributeInvoiceSales(sch.invoice, amt, saleDoanhSo, allStaff);
    });

    // Calculate total current outstanding debt
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

    // Calculate service operating costs (30% of treatment usage value)
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
        netProfit: Math.max(0, totalRevenue - totalBankFee - totalServiceCost),
      },
      salesLeaderboard,
      debts: {
        totalDebt,
        list: debtsList,
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }
    });
  } catch (error: any) {
    console.error("GET Reports Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi tải báo cáo" }, { status: 500 });
  }
}
