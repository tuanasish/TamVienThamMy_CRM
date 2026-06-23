import { db } from "@/lib/db";
import styles from "./page.module.css";
import { TrendingUp, Percent, DollarSign, Wallet, Users, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

const formatVND = (value: any) => {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
};

export default async function ReportsPage() {
  // 1. Fetch Invoices and calculate basic metrics
  const invoices = await db.invoice.findMany({
    include: { staff: true },
  });

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
          target: 30000000, // Standard target 30M
        };
      }
      saleDoanhSo[inv.staffId].totalSales += finalAmt;
    }
  });

  // 2. Fetch Usage Logs for estimating Service Cost (Estimated operational cost: 30% of treatment usage value)
  const usageLogs = await db.usageLog.findMany({
    include: { service: true },
  });
  
  let totalServiceCost = 0;
  usageLogs.forEach((log) => {
    const price = Number(log.service.price);
    // Simulate operational / product cost (cosmetics, accessories) as 30%
    totalServiceCost += price * 0.3;
  });

  const netProfit = Math.max(0, totalRevenue - totalBankFee - totalServiceCost);

  // 3. Fetch unpaid schedules (debts)
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

  const debtsList = Object.values(customerDebts).sort((a, b) => b.debtAmount - a.debtAmount);

  // 4. Sales Leaderboard
  const allStaff = await db.staff.findMany({
    include: { invoices: true },
  });

  const saleTarget = 30000000;
  const salesLeaderboard = allStaff.map((st) => {
    const totalSales = st.invoices.reduce((sum, inv) => sum + Number(inv.finalAmount), 0);
    const progress = Math.min(Math.round((totalSales / saleTarget) * 100), 100);
    return {
      id: st.id,
      name: st.fullName,
      username: st.username,
      totalSales,
      progress,
    };
  }).sort((a, b) => b.totalSales - a.totalSales);

  // Calculate percentages for SVG Donut/Stacked Chart
  const totalFinancialSegments = totalRevenue || 1;
  const profitPercentage = Math.round((netProfit / totalFinancialSegments) * 100);
  const bankFeePercentage = Math.round((totalBankFee / totalFinancialSegments) * 100);
  const costPercentage = Math.round((totalServiceCost / totalFinancialSegments) * 100);

  // Define SVG Pie / Circle parameters (circumference: 314.16 for r=50)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke offsets for donut chart segments
  // 1. Net Profit
  const profitStroke = (profitPercentage / 100) * circumference;
  const profitOffset = circumference;
  
  // 2. Service Cost
  const costStroke = (costPercentage / 100) * circumference;
  const costOffset = circumference - profitStroke;

  // 3. Bank Fees
  const feeStroke = (bankFeePercentage / 100) * circumference;
  const feeOffset = circumference - profitStroke - costStroke;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Báo cáo tài chính &amp; Hiệu suất</h1>
        <p className={styles.subtitle}>Phân tích chi phí, doanh thu spa và doanh số sale</p>
      </header>

      {/* Grid Overview Card */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconWrapper}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Doanh thu gộp</span>
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
            <span className={styles.statLabel}>Tổng công nợ thu hồi</span>
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

          {/* Sales Leaderboard */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Bảng xếp hạng KPI Sales (Chỉ tiêu 30M)</h3>
            
            <div className={styles.saleList}>
              {salesLeaderboard.length === 0 ? (
                <div className={styles.emptyText}>Chưa có dữ liệu doanh số nhân viên</div>
              ) : (
                salesLeaderboard.map((sale) => (
                  <div key={sale.id} className={styles.saleItem}>
                    <div className={styles.saleHeader}>
                      <span>{sale.name} ({sale.username})</span>
                      <strong>
                        {formatVND(sale.totalSales)} / {formatVND(saleTarget)} ({sale.progress}%)
                      </strong>
                    </div>
                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBar}
                        style={{ width: `${sale.progress}%` }}
                      />
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
