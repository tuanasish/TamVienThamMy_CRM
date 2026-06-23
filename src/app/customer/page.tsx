import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import styles from "./page.module.css";
import { Wallet, Sparkles, Activity, Tag } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const formatVND = (value: any) => {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
};

export default async function CustomerDashboard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("spa_crm_session");

  if (!sessionCookie) {
    redirect("/login?role=customer");
  }

  let sessionUser;
  try {
    sessionUser = JSON.parse(sessionCookie.value);
    if (sessionUser.role !== "customer") {
      redirect("/login?role=customer");
    }
  } catch (e) {
    redirect("/login?role=customer");
  }

  // 1. Fetch full details of the customer
  const customer = await db.customer.findUnique({
    where: { id: sessionUser.id },
    include: {
      cards: {
        include: { template: true },
        orderBy: { createdAt: "desc" },
      },
      treatments: {
        include: { service: true },
        orderBy: { createdAt: "desc" },
      },
      usageLogs: {
        include: { service: true },
        orderBy: { usedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) {
    redirect("/login?role=customer");
  }

  // 2. Fetch all Spa services for the catalog
  const spaServices = await db.service.findMany({
    orderBy: { name: "asc" },
  });

  const parsedServices = spaServices.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    notes: s.notes || "",
  }));

  const welcomeName = customer.fullName;
  const currentTier = customer.tier;
  const totalSpent = Number(customer.totalSpent);

  return (
    <div className={styles.container}>
      {/* Welcome Banner */}
      <section className={styles.welcomeSection}>
        <div className={styles.welcomeLeft}>
          <h1 className={styles.greeting}>Xin chào, {welcomeName}!</h1>
          <span className={styles.spendingInfo}>
            Tổng chi tiêu tích lũy: <strong>{formatVND(totalSpent)}</strong>
          </span>
        </div>
        <div className={styles.welcomeRight}>
          <span className={styles.tierLabel}>Hạng thành viên</span>
          <div className={styles.tierBadge}>
            ✨ {currentTier}
          </div>
        </div>
      </section>
      
      {/* Booking Quick Link Banner */}
      <section style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        padding: "1.25rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>Đặt lịch hẹn trị liệu trực tuyến</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Tiết kiệm thời gian chờ đợi. Lựa chọn liệu trình và giờ đến mong muốn ngay tại đây.
          </p>
        </div>
        <Link href="/customer/booking" style={{
          padding: "0.6rem 1.5rem",
          background: "var(--grad-premium)",
          color: "white",
          borderRadius: "var(--radius-sm)",
          fontWeight: 700,
          fontSize: "0.9rem",
          textDecoration: "none",
          boxShadow: "0 4px 12px rgba(197, 160, 89, 0.2)"
        }}>
          Đặt lịch ngay
        </Link>
      </section>

      {/* Primary Details Grid */}
      <div className={styles.grid2}>
        
        {/* Left Card: Account Balance Cards */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>
            <Wallet size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
            Thẻ tài khoản của bạn
          </h3>

          <div className={styles.cardList}>
            {customer.cards.length === 0 ? (
              <div className={styles.emptyText}>Bạn chưa sở hữu thẻ nạp tài khoản nào.</div>
            ) : (
              customer.cards.map((card) => {
                const balance = Number(card.currentBalance);
                const originalPrice = Number(card.originalPrice);
                const originalValue = Number(card.originalValue);
                
                // Account for ratio-based actual vs promo deduction
                const ratio = originalValue > 0 ? originalPrice / originalValue : 0;
                const actualCash = balance * ratio;
                const promoCash = balance - actualCash;

                const formattedDate = new Date(card.createdAt).toLocaleDateString("vi-VN");

                return (
                  <div key={card.id} className={styles.cardItem}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardName}>{card.template.name}</span>
                      <span className={styles.cardDate}>Kích hoạt: {formattedDate}</span>
                    </div>

                    <div className={styles.balanceBlock}>
                      <span className={styles.balanceLabel}>Số dư khả dụng</span>
                      <span className={styles.balanceValue}>{formatVND(balance)}</span>
                    </div>

                    <div className={styles.ratioDetails}>
                      <span>Tiền gốc: <strong>{formatVND(actualCash)}</strong></span>
                      <span>Khuyến mãi: <strong>{formatVND(promoCash)}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Card: Treatments Sessions */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>
            <Sparkles size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
            Liệu trình đang điều trị
          </h3>

          <div className={styles.treatmentList}>
            {customer.treatments.length === 0 ? (
              <div className={styles.emptyText}>Bạn chưa đăng ký liệu trình điều trị nào.</div>
            ) : (
              customer.treatments.map((tr) => {
                const total = tr.totalSessions;
                const used = tr.usedSessions;
                const percent = Math.min(Math.round((used / total) * 100), 100);

                return (
                  <div key={tr.id} className={styles.treatmentItem}>
                    <div className={styles.treatmentHeader}>
                      <span className={styles.treatmentName}>{tr.service.name}</span>
                      <span className={styles.sessionsFraction}>{used}/{total} buổi</span>
                    </div>

                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBar}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Spa Services Catalog Section for Customers */}
      <section className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>
          <Tag size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
          Danh mục dịch vụ Spa cung cấp
        </h3>

        <div className={styles.servicesGrid}>
          {parsedServices.length === 0 ? (
            <div className={styles.emptyText}>Hiện chưa có dịch vụ nào trên hệ thống.</div>
          ) : (
            parsedServices.map((sv) => (
              <div key={sv.id} className={styles.serviceCard}>
                <div className={styles.serviceInfo}>
                  <span className={styles.serviceName}>{sv.name}</span>
                  {sv.notes && (
                    <div style={{ fontSize: "0.85rem", color: "var(--accent-gold)", fontStyle: "italic", marginTop: "0.25rem" }}>
                      {sv.notes}
                    </div>
                  )}
                </div>
                <span className={styles.servicePrice}>
                  {formatVND(sv.price)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Lower Section: Usage History */}
      <section className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>
          <Activity size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
          Nhật ký trị liệu gần đây
        </h3>

        <div className={styles.historyList}>
          {customer.usageLogs.length === 0 ? (
            <div className={styles.emptyText}>Chưa ghi nhận lịch sử trị liệu nào.</div>
          ) : (
            customer.usageLogs.map((log) => {
              const formattedDate = new Date(log.usedAt).toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={log.id} className={styles.historyItem}>
                  <div className={styles.historyLeft}>
                    <span className={styles.historyService}>{log.service.name}</span>
                    <span className={styles.historyMeta}>
                      Kỹ thuật viên: {log.performedBy} | Thời gian: {formattedDate}
                    </span>
                  </div>

                  <div className={styles.historyRight}>
                    {log.sourceType === "card" ? (
                      <>
                        <span className={styles.deductionAmount} style={{ color: "var(--accent-rose)" }}>
                          -{formatVND(log.amountDeducted)}
                        </span>
                        <span className={styles.deductionSource}>Trừ thẻ</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.deductionAmount} style={{ color: "var(--accent-gold)" }}>
                          -{log.sessionsDeducted} buổi
                        </span>
                        <span className={styles.deductionSource}>Trừ liệu trình</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
