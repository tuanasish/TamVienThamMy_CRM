import { db } from "@/lib/db";
import styles from "./page.module.css";
import { Users, DollarSign, Wallet, ShieldCheck } from "lucide-react";

const formatVND = (value: any) => {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
};

export default async function StaffDashboard() {
  // 1. Get today's start and end timestamps
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 2. Fetch total customer count
  const customerCount = await db.customer.count();

  // 3. Fetch today's invoices
  const todayInvoices = await db.invoice.findMany({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + Number(inv.finalAmount), 0);

  // 4. Fetch total unpaid installments (Debts)
  const unpaidSchedules = await db.installmentSchedule.findMany({
    where: { status: "pending" },
    include: {
      invoice: {
        include: { customer: true },
      },
    },
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

  // 5. Fetch all sales by staff for leaderboard
  const allStaff = await db.staff.findMany({
    include: {
      invoices: true,
    },
  });

  const saleTarget = 30000000; // 30M default target
  const saleLeaderboard = allStaff.map((st) => {
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

  const formattedDate = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tổng quan hoạt động</h1>
          <div className={styles.date}>{formattedDate}</div>
        </div>
      </header>

      {/* Grid statistics */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.iconWrapper}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Doanh thu hôm nay</span>
            <span className={styles.statValue}>{formatVND(todayRevenue)}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.iconWrapper}>
            <Wallet size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Tổng tiền nợ (Công nợ)</span>
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
          <h3 className={styles.sectionTitle}>Chỉ tiêu doanh số Sale (Target 30M)</h3>
          
          <div className={styles.saleList}>
            {saleLeaderboard.length === 0 ? (
              <div className={styles.emptyText}>Chưa ghi nhận dữ liệu nhân viên sale</div>
            ) : (
              saleLeaderboard.map((sale) => (
                <div key={sale.id} className={styles.saleItem}>
                  <div className={styles.saleHeader}>
                    <span>{sale.name} ({sale.username})</span>
                    <span>
                      {formatVND(sale.totalSales)} / {formatVND(saleTarget)} ({sale.progress}%)
                    </span>
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
