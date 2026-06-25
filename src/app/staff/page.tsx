export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getVietnamToday, formatVietnamDate } from "@/lib/timezone";
import styles from "./page.module.css";
import { Users, DollarSign, Wallet, ShieldCheck } from "lucide-react";

function attributeInvoiceSales(inv: any, amountPaid: number, saleDoanhSo: Record<string, { staffName: string; totalSales: number }>, allStaff: any[]) {
  const items = inv.items || [];
  if (items.length === 0) {
    if (inv.staffId) {
      if (!saleDoanhSo[inv.staffId]) {
        const staffName = allStaff.find((s) => s.id === inv.staffId)?.fullName || "Nhân viên";
        saleDoanhSo[inv.staffId] = { staffName, totalSales: 0 };
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
        const staffName = allStaff.find((s) => s.id === inv.staffId)?.fullName || "Nhân viên";
        saleDoanhSo[inv.staffId] = { staffName, totalSales: 0 };
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
            saleDoanhSo[staffId] = { staffName, totalSales: 0 };
          }
          saleDoanhSo[staffId].totalSales += splitShare;
        });
      } else {
        const splitShare = itemShare / selectedStaffIds.length;
        selectedStaffIds.forEach((staffId) => {
          if (!saleDoanhSo[staffId]) {
            const staffName = allStaff.find((s) => s.id === staffId)?.fullName || "Nhân viên";
            saleDoanhSo[staffId] = { staffName, totalSales: 0 };
          }
          saleDoanhSo[staffId].totalSales += splitShare;
        });
      }
    }
  });
}

const formatVND = (value: any) => {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
};

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function StaffDashboard({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "day"; // default to daily overview
  const startDateParam = resolvedParams.startDate;
  const endDateParam = resolvedParams.endDate;

  let startDate = new Date();
  let endDate = new Date();

  // Parse time filter
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
    // Default to today
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  // 2. Run ALL queries in parallel
  const [
    customerCount,
    invoices,
    paidSchedules,
    unpaidSchedules,
    allStaff,
  ] = await Promise.all([
    // Customer count
    db.customer.count(),

    // Invoices in selected range
    db.invoice.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        schedules: {
          select: { amount: true },
        },
        items: true,
      },
    }),

    // Paid installments in selected range
    db.installmentSchedule.findMany({
      where: {
        status: "paid",
        paidAt: { gte: startDate, lte: endDate },
      },
    }),

    // All unpaid installments (current outstanding debt)
    db.installmentSchedule.findMany({
      where: {
        status: "pending",
      },
      select: {
        amount: true,
        invoice: {
          select: {
            customerId: true,
            customer: {
              select: { fullName: true, phone: true },
            },
          },
        },
      },
    }),

    // Staff list
    db.staff.findMany(),
  ]);

  let todayRevenue = 0;
  const saleDoanhSo: Record<string, { staffName: string; totalSales: number }> = {};

  // Calculate revenue from invoices in this period
  invoices.forEach((inv) => {
    const finalAmt = Number(inv.finalAmount);
    let invRevenue = 0;
    if (inv.paymentType === "installment") {
      if (inv.installmentType === "counter") {
        const totalDebt = inv.schedules.reduce((sum, sch) => sum + Number(sch.amount), 0);
        invRevenue = Math.max(0, finalAmt - totalDebt); // down payment only
      } else {
        invRevenue = finalAmt; // Home Credit / Mirae Asset pays full amount immediately
      }
    } else {
      invRevenue = finalAmt;
    }
    todayRevenue += invRevenue;

    attributeInvoiceSales(inv, invRevenue, saleDoanhSo, allStaff);
  });

  // Add revenue from paid installments in this period
  paidSchedules.forEach((sch) => {
    const amt = Number(sch.amount);
    todayRevenue += amt;
  });

  // Re-fetch paid schedules with invoice cashier details to attribute sales properly
  const paidSchedulesWithStaff = await db.installmentSchedule.findMany({
    where: {
      status: "paid",
      paidAt: { gte: startDate, lte: endDate },
    },
    include: {
      invoice: {
        include: {
          items: true,
        },
      },
    },
  });

  paidSchedulesWithStaff.forEach((sch) => {
    const amt = Number(sch.amount);
    attributeInvoiceSales(sch.invoice, amt, saleDoanhSo, allStaff);
  });

  const totalDebt = unpaidSchedules.reduce((sum, sch) => sum + Number(sch.amount), 0);

  // Group debt list by customer
  const customerDebts: Record<string, { name: string; phone: string; amount: number }> = {};
  unpaidSchedules.forEach((sch) => {
    const custId = sch.invoice.customerId;
    const schAmt = Number(sch.amount);
    if (!customerDebts[custId]) {
      customerDebts[custId] = {
        name: sch.invoice.customer.fullName,
        phone: sch.invoice.customer.phone,
        amount: 0,
      };
    }
    customerDebts[custId].amount += schAmt;
  });
  const debtsList = Object.values(customerDebts).sort((a, b) => b.amount - a.amount).slice(0, 5);

  // 3. Sales leaderboard with precise decimal percentages
  const saleTarget = 30000000; // 30M default target
  const saleLeaderboard = allStaff.map((st) => {
    const totalSales = saleDoanhSo[st.id]?.totalSales || 0;
    const progress = Number(((totalSales / saleTarget) * 100).toFixed(2));
    return {
      id: st.id,
      name: st.fullName,
      username: st.username,
      totalSales,
      progress,
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  const formattedDate = `Từ ${startDate.toLocaleDateString("vi-VN")} đến ${endDate.toLocaleDateString("vi-VN")}`;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tổng quan hoạt động</h1>
          <div className={styles.date} style={{ marginTop: "0.25rem", fontWeight: "600", color: "var(--accent-gold)" }}>{formattedDate}</div>
        </div>
      </header>

      {/* Date Filter Toolbar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        padding: "1rem 1.5rem",
        boxShadow: "var(--shadow-sm)",
        marginBottom: "0.5rem"
      }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href={`?filter=day`} style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: filter === "day" ? "white" : "var(--text-secondary)",
            background: filter === "day" ? "var(--grad-premium)" : "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            boxShadow: filter === "day" ? "0 2px 8px rgba(197,160,89,0.2)" : "none"
          }}>Hôm nay</a>
          <a href={`?filter=week`} style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: filter === "week" ? "white" : "var(--text-secondary)",
            background: filter === "week" ? "var(--grad-premium)" : "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            boxShadow: filter === "week" ? "0 2px 8px rgba(197,160,89,0.2)" : "none"
          }}>Tuần</a>
          <a href={`?filter=month`} style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: filter === "month" ? "white" : "var(--text-secondary)",
            background: filter === "month" ? "var(--grad-premium)" : "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            boxShadow: filter === "month" ? "0 2px 8px rgba(197,160,89,0.2)" : "none"
          }}>Tháng</a>
          <a href={`?filter=year`} style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: filter === "year" ? "white" : "var(--text-secondary)",
            background: filter === "year" ? "var(--grad-premium)" : "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            boxShadow: filter === "year" ? "0 2px 8px rgba(197,160,89,0.2)" : "none"
          }}>Năm</a>
        </div>
        <form method="GET" action="/staff" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input type="hidden" name="filter" value="custom" />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            <input
              type="date"
              name="startDate"
              defaultValue={startDateParam || startDate.toLocaleDateString("sv-SE")}
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)"
              }}
              required
            />
            <span>đến</span>
            <input
              type="date"
              name="endDate"
              defaultValue={endDateParam || endDate.toLocaleDateString("sv-SE")}
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)"
              }}
              required
            />
          </div>
          <button type="submit" style={{
            padding: "0.35rem 1rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: "white",
            background: "var(--text-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer"
          }}>Lọc</button>
        </form>
      </div>

      {/* Grid statistics */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconWrapper}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Doanh thu trong kỳ (Thực thu)</span>
            <span className={styles.statValue}>{formatVND(todayRevenue)}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconWrapper}>
            <Wallet size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Tổng tiền nợ (Công nợ hiện tại)</span>
            <span className={styles.statValue} style={{ color: "var(--accent-rose)" }}>
              {formatVND(totalDebt)}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconWrapper}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Khách hàng trên hệ thống</span>
            <span className={styles.statValue}>{customerCount}</span>
          </div>
        </div>
      </section>

      {/* Main Section Content */}
      <div className={styles.contentGrid}>
        {/* Left Side: Sale Leaderboard */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Chỉ tiêu doanh số Sale (Target {formatVND(saleTarget)})</h3>
          
          <div className={styles.saleList}>
            {saleLeaderboard.length === 0 ? (
              <div className={styles.emptyText}>Chưa ghi nhận dữ liệu nhân viên sale</div>
            ) : (
              saleLeaderboard.map((sale) => (
                <div key={sale.id} className={styles.saleItem}>
                  <div className={styles.saleHeader}>
                    <span>{sale.name} ({sale.username})</span>
                    <strong>
                      {formatVND(sale.totalSales)} / {formatVND(saleTarget)} (
                      <span style={{ color: "#28a745", fontWeight: "bold" }}>{sale.progress}%</span>)
                    </strong>
                  </div>
                  <div className={styles.progressBarContainer} style={{ height: "10px", background: "var(--bg-primary)", borderRadius: "5px", overflow: "hidden" }}>
                    <div 
                      className={styles.progressBar} 
                      style={{
                        width: `${Math.min(sale.progress, 100)}%`,
                        height: "100%",
                        background: "#28a745", // green progress bar
                        borderRadius: "5px"
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Unpaid Installments Alert */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Theo dõi công nợ lớn nhất</h3>

          <div className={styles.debtsList}>
            {debtsList.length === 0 ? (
              <div className={styles.emptyText} style={{ color: "var(--accent-gold)" }}>
                🎉 Tuyệt vời! Không có nợ xấu cần thu.
              </div>
            ) : (
              debtsList.map((debt, index) => (
                <div key={index} className={styles.debtItem}>
                  <div className={styles.debtInfo}>
                    <span className={styles.debtName}>{debt.name}</span>
                    <span className={styles.debtPhone}>{debt.phone}</span>
                  </div>
                  <span className={styles.debtAmount}>{formatVND(debt.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
