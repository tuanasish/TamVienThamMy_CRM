import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import styles from "./page.module.css";
import { Wallet, Sparkles, Activity, Tag, Home, Award, Gift, Calendar, Phone } from "lucide-react";
import Link from "next/link";
import CustomerPromotions from "@/components/CustomerPromotions";

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

  // 2. Fetch active Promotions
  const activePromotions = await db.promotion.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  // Lọc bỏ các cấu hình giao diện CMS (Bảng giá và Feedback) ra khỏi danh sách ưu đãi đăng ký dành cho khách hàng
  const filteredPromotions = activePromotions.filter((p) => {
    // Check if it's feedback (contains comma in image field)
    const isFeedback = p.image && p.image.includes(",");
    
    // Check if it's a pricing list
    const lines = p.description ? p.description.split("\n").map(l => l.trim()).filter(Boolean) : [];
    let isPricing = lines.length > 0;
    for (const line of lines) {
      let separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) separatorIndex = line.indexOf("|");
      if (separatorIndex === -1) separatorIndex = line.indexOf(" - ");
      if (separatorIndex === -1) {
        isPricing = false;
        break;
      }
      const name = line.substring(0, separatorIndex).trim();
      const offset = line.startsWith(" - ", separatorIndex) ? 3 : 1;
      const price = line.substring(separatorIndex + offset).trim();
      if (!name || !price) {
        isPricing = false;
        break;
      }
    }
    return !isFeedback && !isPricing;
  });

  // 3. Fetch Spa services for suggestions
  const spaServices = await db.service.findMany({
    orderBy: { name: "asc" },
  });

  const welcomeName = customer.fullName;
  const currentTier = customer.tier;
  const totalSpent = Number(customer.totalSpent);

  // 4. Time-based dynamic greeting (Vietnam Time UTC+7)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const vietnamTime = new Date(utc + (3600000 * 7));
  const currentHour = vietnamTime.getHours();
  
  let greeting = "Xin chào";
  if (currentHour >= 5 && currentHour < 12) {
    greeting = "Chào buổi sáng ☀️";
  } else if (currentHour >= 12 && currentHour < 18) {
    greeting = "Chào buổi chiều 🌤️";
  } else {
    greeting = "Chào buổi tối 🌙";
  }

  // 5. Points calculation (1 million = 1 point)
  const points = Math.floor(totalSpent / 1000000);
  const milestoneInterval = 30; // 30 points = 30M spent for reward
  const nextTargetPoints = Math.ceil((points + 0.1) / milestoneInterval) * milestoneInterval;
  const pointsNeeded = nextTargetPoints - points;
  const progressPercent = Math.min(Math.round((points / nextTargetPoints) * 100), 100);

  // 6. Split services into purchased and suggestions (suggestions hide price)
  const purchasedServiceIds = new Set(customer.treatments.map(t => t.serviceId));
  
  const suggestedServices = spaServices
    .filter(s => s.type === "service" && !purchasedServiceIds.has(s.id))
    .slice(0, 4) // Show top 4 suggestions
    .map(s => ({
      id: s.id,
      name: s.name,
      notes: s.notes || "",
    }));

  return (
    <div className={styles.container}>
      {/* Welcome Banner */}
      <section className={styles.welcomeSection}>
        <div className={styles.welcomeLeft}>
          <h1 className={styles.greeting}>{greeting}, {welcomeName}!</h1>
          <span className={styles.spendingInfo}>
            Tổng điểm tích lũy: <strong>{points} điểm</strong>
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
      <section className={styles.bookingBanner}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>Đặt lịch hẹn trị liệu trực tuyến</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Tiết kiệm thời gian chờ đợi. Lựa chọn liệu trình và giờ đến mong muốn ngay tại đây.
          </p>
        </div>
        <Link href="/customer/booking" className={styles.bookingBtn}>
          Đặt lịch ngay
        </Link>
      </section>

      {/* EXCLUSIVE PROMOTIONS (Requirement 1) */}
      <div id="promotions">
        <CustomerPromotions
          promotions={filteredPromotions}
          customerName={customer.fullName}
          customerPhone={customer.phone}
        />
      </div>

      {/* POINTS TRACKING DETAILS SECTION */}
      <section id="points" className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>
          <Award size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle", color: "var(--accent-gold)" }} />
          Chương trình Tích điểm đổi quà lớn
        </h3>
        
        <div className={styles.pointsDetailsBlock}>
          <div className={styles.pointsScoreRow}>
            <div>
              <span className={styles.pointsLabel}>Điểm tích lũy hiện tại</span>
              <h2 className={styles.pointsScore}>{points} <span style={{ fontSize: "1.2rem", fontWeight: "normal" }}>điểm</span></h2>
            </div>
          </div>

          <div className={styles.pointsProgressBlock}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              <span>Tiến trình nhận quà mốc {nextTargetPoints} điểm:</span>
              <span style={{ color: "var(--accent-gold)" }}>{points}/{nextTargetPoints} điểm</span>
            </div>
            
            <div className={styles.pointsProgressBarTrack}>
              <div className={styles.pointsProgressBarFill} style={{ width: `${progressPercent}%` }} />
            </div>

            <div className={styles.pointsAlertBox}>
              🎁 Bạn đang có <strong>{points} điểm</strong> tích lũy. Chỉ cần tích lũy thêm <strong>{pointsNeeded} điểm</strong> nữa để đạt mốc {nextTargetPoints} điểm và nhận ngay <strong>Ưu đãi trị giá 10.000.000đ</strong> từ Spa!
            </div>
          </div>
        </div>
      </section>

      {/* ACCOUNTS & LIỆU TRÌNH SECTION (Quản lý dịch vụ) */}
      <div id="services" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Hàng 1: Dịch vụ của bạn (Gói/Thẻ và Dịch vụ/Sản phẩm) */}
        <div className={styles.grid2}>
          {/* Left Card: Account Balance Cards */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>
              <Wallet size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle", color: "var(--accent-gold)" }} />
              Gói / Thẻ tài khoản của bạn
            </h3>

            <div className={styles.cardList}>
              {customer.cards.length === 0 ? (
                <div className={styles.emptyText}>Bạn chưa sở hữu thẻ nạp tài khoản nào.</div>
              ) : (
                customer.cards.map((card) => {
                  const balance = Number(card.currentBalance);
                  const originalPrice = Number(card.originalPrice);
                  const originalValue = Number(card.originalValue);
                  
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
              <Sparkles size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle", color: "var(--accent-gold)" }} />
              Dịch vụ &amp; Sản phẩm đã mua
            </h3>

            <div className={styles.treatmentList}>
              {customer.treatments.length === 0 ? (
                <div className={styles.emptyText}>Bạn chưa mua gói trị liệu nào. Hãy tham khảo danh mục gợi ý bên dưới nhé!</div>
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

        {/* Hàng 2: Lịch sử điều trị */}
        <div id="history" className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>
            <Activity size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle", color: "var(--accent-gold)" }} />
            Lịch sử điều trị
          </h3>

          <div className={styles.historyList}>
            {customer.usageLogs.length === 0 ? (
              <div className={styles.emptyText}>Chưa ghi nhận lịch sử điều trị nào.</div>
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
        </div>

      </div>

      {/* FEATURED SERVICE SUGGESTIONS SECTION (Requirement 7) */}
      <section className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>
          <Tag size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle", color: "var(--accent-gold)" }} />
          Dịch vụ mong muốn thực hiện (Gợi ý cho bạn)
        </h3>

        <div className={styles.servicesGrid}>
          {suggestedServices.length === 0 ? (
            <div className={styles.emptyText}>Spa hiện chưa cập nhật thêm các dịch vụ gợi ý mới.</div>
          ) : (
            suggestedServices.map((sv) => (
              <div key={sv.id} className={styles.serviceCard}>
                <div className={styles.serviceInfo}>
                  <span className={styles.serviceName}>{sv.name}</span>
                  {sv.notes && (
                    <div className={styles.serviceNotes}>
                      {sv.notes}
                    </div>
                  )}
                </div>
                {/* DO NOT DISPLAY PRICE AS REQUESTED */}
                <Link href="/customer/booking" className={styles.serviceRegisterLink}>
                  Đặt lịch tư vấn
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
