import { db } from "@/lib/db";
import styles from "./page.module.css";
import { TrendingUp, Percent, DollarSign, Wallet, Users, BarChart3, Calendar } from "lucide-react";

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
            saleDoanhSo[staffId] = { staffName, totalSales: 0, target: 30000000 };
          }
          saleDoanhSo[staffId].totalSales += splitShare;
        });
      } else {
        const splitShare = itemShare / selectedStaffIds.length;
        selectedStaffIds.forEach((staffId) => {
          if (!saleDoanhSo[staffId]) {
            const staffName = allStaff.find((s) => s.id === staffId)?.fullName || "Nhân viên";
            saleDoanhSo[staffId] = { staffName, totalSales: 0, target: 30000000 };
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

    // 2. Fetch Paid installments in range (only Spa's counter debt)
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
      include: {
        invoice: {
          include: {
            staff: true,
            items: true,
          },
        },
      },
    }),

    // 3. Fetch unpaid schedules (current outstanding Spa debt)
    db.installmentSchedule.findMany({
      where: {
        status: "pending",
        invoice: {
          installmentType: "counter",
        },
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

  // Service operational costs (30%)
  let totalServiceCost = 0;
  usageLogs.forEach((log) => {
    totalServiceCost += Number(log.service.price) * 0.3;
  });

  const netProfit = Math.max(0, totalRevenue - totalBankFee - totalServiceCost);

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
  const saleTarget = 30000000;
  const salesLeaderboard = allStaff.map((st) => {
    const totalSales = saleDoanhSo[st.id]?.totalSales || 0;
    // Format progress as exact decimal percentage (e.g., 2.68% or 120.50%)
    const progress = Number(((totalSales / saleTarget) * 100).toFixed(2));
    return {
      id: st.id,
      name: st.fullName,
      username: st.username,
      totalSales,
      progress,
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  // Financial pie chart percentages
  const totalFinancialSegments = totalRevenue || 1;
  const profitPercentage = Math.round((netProfit / totalFinancialSegments) * 100);
  const bankFeePercentage = Math.round((totalBankFee / totalFinancialSegments) * 100);
  const costPercentage = Math.round((totalServiceCost / totalFinancialSegments) * 100);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  const profitStroke = (profitPercentage / 100) * circumference;
  const profitOffset = circumference;
  const costStroke = (costPercentage / 100) * circumference;
  const costOffset = circumference - profitStroke;
  const feeStroke = (bankFeePercentage / 100) * circumference;
  const feeOffset = circumference - profitStroke - costStroke;

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
          <div className={`${styles.iconWrapper} ${styles.iconWrapperProfit}`}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Lợi nhuận ròng (Ước tính)</span>
            <span className={styles.statValue} style={{ color: "#28a745" }}>
              {formatVND(netProfit)}
            </span>
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
          
          {/* Revenue Allocation Chart */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Cơ cấu sử dụng doanh thu</h3>
            
            <div className={styles.chartContainer}>
              <svg width="220" height="220" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                {/* Background Track */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke="var(--border-color)"
                  strokeWidth="14"
                />
                
                {/* Net Profit Segment */}
                {profitPercentage > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke="#28a745"
                    strokeWidth="14"
                    strokeDasharray={`${profitStroke} ${circumference}`}
                    strokeDashoffset={profitOffset}
                    strokeLinecap="round"
                  />
                )}

                {/* Service Cost Segment */}
                {costPercentage > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke="var(--accent-gold)"
                    strokeWidth="14"
                    strokeDasharray={`${costStroke} ${circumference}`}
                    strokeDashoffset={costOffset}
                    strokeLinecap="round"
                  />
                )}

                {/* Bank Fees Segment */}
                {bankFeePercentage > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke="var(--accent-rose)"
                    strokeWidth="14"
                    strokeDasharray={`${feeStroke} ${circumference}`}
                    strokeDashoffset={feeOffset}
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>

            <div className={styles.chartLabelGrid}>
              <div className={styles.chartLabelItem}>
                <div className={styles.colorIndicator} style={{ background: "#28a745" }} />
                <span>Lợi nhuận ròng: <strong>{profitPercentage}%</strong></span>
              </div>
              <div className={styles.chartLabelItem}>
                <div className={styles.colorIndicator} style={{ background: "var(--accent-gold)" }} />
                <span>Chi phí liệu trình: <strong>{costPercentage}%</strong></span>
              </div>
              <div className={styles.chartLabelItem}>
                <div className={styles.colorIndicator} style={{ background: "var(--accent-rose)" }} />
                <span>Phí trả góp (NH): <strong>{bankFeePercentage}%</strong></span>
              </div>
              <div className={styles.chartLabelItem}>
                <div className={styles.colorIndicator} style={{ background: "var(--text-secondary)" }} />
                <span>Khác: <strong>{Math.max(0, 100 - profitPercentage - costPercentage - bankFeePercentage)}%</strong></span>
              </div>
            </div>
          </div>

          {/* Sales Leaderboard with Milestone Green Progress Bars */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Bảng xếp hạng KPI Sales (Chỉ tiêu {formatVND(saleTarget)})</h3>
            
            <div className={styles.saleList}>
              {salesLeaderboard.length === 0 ? (
                <div className={styles.emptyText}>Chưa có dữ liệu doanh số nhân viên</div>
              ) : (
                salesLeaderboard.map((sale) => (
                  <div key={sale.id} className={styles.kpiContainer}>
                    <div className={styles.kpiHeaderFlex}>
                      <span>{sale.name} ({sale.username})</span>
                      <strong>
                        {formatVND(sale.totalSales)} / {formatVND(saleTarget)} (
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
