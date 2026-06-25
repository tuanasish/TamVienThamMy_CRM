import { db } from "@/lib/db";
import styles from "./page.module.css";
import { TrendingUp, Percent, DollarSign, Wallet, Users, BarChart3, Calendar, ShieldAlert } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

export const dynamic = "force-dynamic";

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

export default async function ReportsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("spa_crm_session");
  if (!sessionCookie) redirect("/login?role=staff");

  let parsed;
  try {
    parsed = JSON.parse(sessionCookie.value);
  } catch (e) {
    redirect("/login?role=staff");
  }

  // Fetch live role from DB
  const dbStaff = await db.staff.findUnique({
    where: { id: parsed.id },
    select: { role: true }
  });

  if (dbStaff?.role !== "admin") {
    return (
      <div style={{
        padding: "5rem 2rem",
        textAlign: "center",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        maxWidth: "600px",
        margin: "4rem auto"
      }}>
        <ShieldAlert size={48} style={{ color: "var(--accent-rose)", marginBottom: "1.5rem" }} />
        <h2 style={{ color: "var(--accent-rose)", fontWeight: 800, fontSize: "1.8rem", marginBottom: "1rem", marginTop: 0 }}>
          Không có quyền truy cập
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
          Khu vực này chứa thông tin bảo mật tài chính và chỉ dành riêng cho Quản trị viên (Admin).
        </p>
        <a href="/staff" style={{
          padding: "0.6rem 1.5rem",
          background: "var(--grad-premium)",
          color: "white",
          borderRadius: "var(--radius-sm)",
          fontWeight: "700",
          textDecoration: "none",
          boxShadow: "0 2px 8px rgba(197,160,89,0.2)"
        }}>
          Quay lại Trang chủ
        </a>
      </div>
    );
  }

  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "month";
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
    // Default to current month
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  // Run all reports queries in parallel for peak performance
  const [invoices, paidSchedules, unpaidSchedules, usageLogs, allStaff] = await Promise.all([
    // 1. Fetch Invoices in range
    db.invoice.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        staff: true,
        schedules: {
          select: {
            amount: true,
          },
        },
        items: true,
      },
    }),

    // 2. Fetch Paid installments in range
    db.installmentSchedule.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        invoice: {
          include: {
            staff: true,
            items: true,
          },
        },
      },
    }),

    // 3. Fetch unpaid schedules (current outstanding debt)
    db.installmentSchedule.findMany({
      where: {
        status: "pending",
      },
      include: {
        invoice: {
          include: { customer: true },
        },
      },
    }),

    // 4. Fetch Usage Logs in range
    db.usageLog.findMany({
      where: {
        usedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { service: true },
    }),

    // 5. Fetch all staff members
    db.staff.findMany(),
  ]);

  let totalRevenue = 0;
  let totalBankFee = 0;
  const saleDoanhSo: Record<string, { staffName: string; totalSales: number; target: number }> = {};

  // Process core invoices in range
  invoices.forEach((inv) => {
    const finalAmt = Number(inv.finalAmount);
    const fee = Number(inv.bankFee);
    totalBankFee += fee;

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
    totalRevenue += invRevenue;

    attributeInvoiceSales(inv, invRevenue, saleDoanhSo, allStaff);
  });

  // Add paid installments in range to revenue and staff sales
  paidSchedules.forEach((sch) => {
    const amt = Number(sch.amount);
    totalRevenue += amt;

    attributeInvoiceSales(sch.invoice, amt, saleDoanhSo, allStaff);
  });

  // Calculate current outstanding debt list
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

  const debtsList = Object.values(customerDebts).sort((a, b) => b.debtAmount - a.debtAmount);

  // Sales Leaderboard with precise decimals and target target achievement
  const salesLeaderboard = allStaff.map((st) => {
    const totalSales = saleDoanhSo[st.id]?.totalSales || 0;
    const target = st.target ? Number(st.target) : 30000000;
    // Format progress as exact decimal percentage (e.g., 2.68% or 120.50%)
    const progress = Number(((totalSales / target) * 100).toFixed(2));
    return {
      id: st.id,
      name: st.fullName,
      username: st.username,
      totalSales,
      target,
      progress,
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Báo cáo tài chính &amp; Hiệu suất</h1>
        <p className={styles.subtitle}>Phân tích chi phí, doanh thu spa và doanh số sale</p>
      </header>

      {/* Date Filter Toolbar Component */}
      <div className={styles.filterToolbar}>
        <div className={styles.filterButtons}>
          <a href={`?filter=day`} className={`${styles.filterBtn} ${filter === "day" ? styles.filterBtnActive : ""}`}>Ngày</a>
          <a href={`?filter=week`} className={`${styles.filterBtn} ${filter === "week" ? styles.filterBtnActive : ""}`}>Tuần</a>
          <a href={`?filter=month`} className={`${styles.filterBtn} ${filter === "month" ? styles.filterBtnActive : ""}`}>Tháng</a>
          <a href={`?filter=year`} className={`${styles.filterBtn} ${filter === "year" ? styles.filterBtnActive : ""}`}>Năm</a>
        </div>
        <form method="GET" action="/staff/reports" className={styles.customDateForm}>
          <input type="hidden" name="filter" value="custom" />
          <div className={styles.dateInputGroup}>
            <input
              type="date"
              name="startDate"
              defaultValue={startDateParam || startDate.toLocaleDateString("sv-SE")}
              className={styles.dateInput}
              required
            />
            <span>đến</span>
            <input
              type="date"
              name="endDate"
              defaultValue={endDateParam || endDate.toLocaleDateString("sv-SE")}
              className={styles.dateInput}
              required
            />
          </div>
          <button type="submit" className={styles.filterSubmitBtn}>Lọc</button>
        </form>
      </div>

      {/* Grid Overview Card */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconWrapper}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Doanh thu gộp (Thực thu)</span>
            <span className={styles.statValue}>{formatVND(totalRevenue)}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconWrapper} ${styles.iconWrapperLoss}`}>
            <Percent size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Phí ngân hàng (Trả góp)</span>
            <span className={styles.statValue} style={{ color: "var(--accent-rose)" }}>
              {formatVND(totalBankFee)}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconWrapper}>
            <Wallet size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Tổng công nợ cần thu</span>
            <span className={styles.statValue}>{formatVND(totalDebt)}</span>
          </div>
        </div>
      </section>

      {/* Two Column Grid */}
      <div className={styles.contentGrid}>
        {/* Left column: Analytics and Sales */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Sales Leaderboard with Milestone Green Progress Bars */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Bảng xếp hạng KPI Sales</h3>
            
            <div className={styles.saleList}>
              {salesLeaderboard.length === 0 ? (
                <div className={styles.emptyText}>Chưa có dữ liệu doanh số nhân viên</div>
              ) : (
                salesLeaderboard.map((sale) => (
                  <div key={sale.id} className={styles.kpiContainer}>
                    <div className={styles.kpiHeaderFlex}>
                      <span>{sale.name} ({sale.username})</span>
                      <strong>
                        {formatVND(sale.totalSales)} / {formatVND(sale.target)} (
                        <span style={{ color: "#28a745", fontWeight: "bold" }}>{sale.progress}%</span>)
                      </strong>
                    </div>

                    <div className={styles.milestoneBarContainer}>
                      <div
                        className={styles.milestoneBarFill}
                        style={{ width: `${Math.min(sale.progress / 2, 100)}%` }}
                      />

                      <div className={styles.milestoneMarker} style={{ left: "50%" }}>
                        <div className={styles.milestoneLine} />
                        <span className={styles.milestoneLabel}>100%</span>
                      </div>
                      <div className={styles.milestoneMarker} style={{ left: "60%" }}>
                        <div className={styles.milestoneLine} />
                        <span className={styles.milestoneLabel}>120%</span>
                      </div>
                      <div className={styles.milestoneMarker} style={{ left: "75%" }}>
                        <div className={styles.milestoneLine} />
                        <span className={styles.milestoneLabel}>150%</span>
                      </div>
                      <div className={styles.milestoneMarker} style={{ left: "100%" }}>
                        <div className={styles.milestoneLine} />
                        <span className={styles.milestoneLabel}>200%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right column: Outstanding Debts */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Danh sách công nợ khách hàng</h3>
          
          <div className={styles.debtsList}>
            {debtsList.length === 0 ? (
              <div className={styles.emptyText}>🎉 Hiện tại không có khách nợ trả góp.</div>
            ) : (
              debtsList.map((d, index) => (
                <div key={index} className={styles.debtItem}>
                  <div className={styles.debtInfo}>
                    <span className={styles.debtName}>{d.customerName}</span>
                    <span className={styles.debtPhone}>{d.phone}</span>
                  </div>
                  <strong className={styles.debtAmount}>{formatVND(d.debtAmount)}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
