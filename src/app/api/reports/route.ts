import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function attributeInvoiceSales(inv: any, amountPaid: number, saleDoanhSo: Record<string, { staffName: string; totalSales: number; target: number }>, allStaff: any[]) {
  const items = inv.items || [];
  if (items.length === 0) {
    if (inv.staffId) {
      if (!saleDoanhSo[inv.staffId]) {
        const staffName = inv.staff?.fullName || allStaff.find((s) => s.id === inv.staffId)?.fullName || "Nhân viên";
        const staffObj = allStaff.find((s) => s.id === inv.staffId);
        const target = staffObj?.target ? Number(staffObj.target) : 30000000;
        saleDoanhSo[inv.staffId] = { staffName, totalSales: 0, target };
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
        const staffObj = allStaff.find((s) => s.id === inv.staffId);
        const target = staffObj?.target ? Number(staffObj.target) : 30000000;
        saleDoanhSo[inv.staffId] = { staffName, totalSales: 0, target };
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
      // Check if any ID contains a percentage colon
      const hasPercentages = selectedStaffIds.some((id) => id.includes(":"));

      if (hasPercentages) {
        selectedStaffIds.forEach((item) => {
          const parts = item.split(":");
          const staffId = parts[0];
          const percent = parts[1] ? Number(parts[1]) : (100 / selectedStaffIds.length);
          const splitShare = itemShare * (percent / 100);

          if (!saleDoanhSo[staffId]) {
            const staffName = allStaff.find((s) => s.id === staffId)?.fullName || "Nhân viên";
            const staffObj = allStaff.find((s) => s.id === staffId);
            const target = staffObj?.target ? Number(staffObj.target) : 30000000;
            saleDoanhSo[staffId] = { staffName, totalSales: 0, target };
          }
          saleDoanhSo[staffId].totalSales += splitShare;
        });
      } else {
        const splitShare = itemShare / selectedStaffIds.length;
        selectedStaffIds.forEach((staffId) => {
          if (!saleDoanhSo[staffId]) {
            const staffName = allStaff.find((s) => s.id === staffId)?.fullName || "Nhân viên";
            const staffObj = allStaff.find((s) => s.id === staffId);
            const target = staffObj?.target ? Number(staffObj.target) : 30000000;
            saleDoanhSo[staffId] = { staffName, totalSales: 0, target };
          }
          saleDoanhSo[staffId].totalSales += splitShare;
        });
      }
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

    const monthlyStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 0, 0, 0, 0);
    const monthlyEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const isMonthRange = startDate.getTime() === monthlyStartDate.getTime() && endDate.getTime() === monthlyEndDate.getTime();

    // Run queries in parallel
    const [
      invoices,
      unpaidSchedules,
      paidSchedules,
      usageLogs,
      allStaff,
      monthlyInvoices,
      monthlyPaidSchedules,
    ] = await Promise.all([
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
          paidAmountOffset: true,
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

      // 2. All unpaid installments (current outstanding debt)
      db.installmentSchedule.findMany({
        where: {
          status: "pending",
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

      // 6. Monthly Invoices for KPI leaderboard
      isMonthRange
        ? Promise.resolve([])
        : db.invoice.findMany({
            where: {
              createdAt: { gte: monthlyStartDate, lte: monthlyEndDate },
            },
            select: {
              paymentType: true,
              installmentType: true,
              finalAmount: true,
              bankFee: true,
              paidAmountOffset: true,
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

      // 7. Monthly Paid installments for KPI leaderboard
      isMonthRange
        ? Promise.resolve([])
        : db.installmentSchedule.findMany({
            where: {
              status: "paid",
              paidAt: { gte: monthlyStartDate, lte: monthlyEndDate },
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
    ]);

    let totalRevenue = 0;
    let totalBankFee = 0;
    const saleDoanhSo: Record<string, { staffName: string; totalSales: number; target: number }> = {};

    // Calculate revenue from core invoices in this period
    invoices.forEach((inv) => {
      const finalAmt = Number(inv.finalAmount);
      const fee = Number(inv.bankFee);
      const offset = Number(inv.paidAmountOffset || 0);
      totalBankFee += fee;

      let invRevenue = 0;
      if (inv.paymentType === "installment") {
        if (inv.installmentType === "counter") {
          const totalDebt = inv.schedules.reduce((sum, sch) => sum + Number(sch.amount), 0);
          // Down payment = finalAmount - total installment debt - offset
          invRevenue = Math.max(0, finalAmt - totalDebt - offset);
        } else {
          invRevenue = Math.max(0, finalAmt - offset); // Home Credit / Mirae Asset pays full amount immediately
        }
      } else {
        invRevenue = Math.max(0, finalAmt - offset);
      }

      totalRevenue += invRevenue;
    });

    // Add revenue from paid installments in this period
    paidSchedules.forEach((sch) => {
      const amt = Number(sch.amount);
      totalRevenue += amt;
    });

    // Determine which target datasets to use for monthly leaderboard calculation
    const targetInvoices = isMonthRange ? invoices : monthlyInvoices;
    const targetPaidSchedules = isMonthRange ? paidSchedules : monthlyPaidSchedules;

    // Process monthly invoices and paid schedules for staff target/sales leaderboard
    targetInvoices.forEach((inv) => {
      const finalAmt = Number(inv.finalAmount);
      const offset = Number(inv.paidAmountOffset || 0);
      let invRevenue = 0;
      if (inv.paymentType === "installment") {
        if (inv.installmentType === "counter") {
          const totalDebt = inv.schedules.reduce((sum, sch) => sum + Number(sch.amount), 0);
          invRevenue = Math.max(0, finalAmt - totalDebt - offset);
        } else {
          invRevenue = Math.max(0, finalAmt - offset);
        }
      } else {
        invRevenue = Math.max(0, finalAmt - offset);
      }
      attributeInvoiceSales(inv, invRevenue, saleDoanhSo, allStaff);
    });

    targetPaidSchedules.forEach((sch) => {
      const amt = Number(sch.amount);
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

    const salesLeaderboard = Object.values(saleDoanhSo).sort((a, b) => b.totalSales - a.totalSales);
    const debtsList = Object.values(customerDebts).sort((a, b) => b.debtAmount - a.debtAmount);

    return NextResponse.json({
      revenueSummary: {
        totalRevenue,
        totalBankFee,
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
