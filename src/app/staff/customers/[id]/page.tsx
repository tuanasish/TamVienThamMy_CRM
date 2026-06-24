import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import RecordUsageModal from "@/components/RecordUsageModal";
import EditCustomerModal from "@/components/EditCustomerModal";
import DeleteCustomerButton from "@/components/DeleteCustomerButton";
import { ArrowLeft, User, Phone, MapPin, Calendar, CreditCard, Activity, Receipt, FileText } from "lucide-react";
import CustomerInvoicesList from "@/components/CustomerInvoicesList";

interface PageProps {
  params: Promise<{ id: string }>;
}

const formatVND = (value: any) => {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
};

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Fetch customer details (including invoice schedules and items)
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { createdAt: "desc" },
        include: { 
          staff: true,
          schedules: true,
          items: true,
        },
      },
      cards: {
        include: { template: true },
      },
      treatments: {
        include: { service: true },
      },
      usageLogs: {
        orderBy: { usedAt: "desc" },
        include: { service: true, staff: true },
      },
    },
  });

  if (!customer) {
    redirect("/staff/customers");
  }

  // Fetch unpaid schedules to compute total outstanding debt
  const unpaidSchedules = await db.installmentSchedule.findMany({
    where: {
      invoice: { customerId: id },
      status: "pending",
    },
    select: { amount: true },
  });
  const totalDebt = unpaidSchedules.reduce((sum, item) => sum + Number(item.amount), 0);

  // 2. Fetch services catalog for card usage selections
  const services = await db.service.findMany({
    orderBy: { name: "asc" },
  });

  const parsedServices = services.map(s => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    type: s.type,
  }));

  // Fetch card templates
  const cardTemplates = await db.cardTemplate.findMany({
    orderBy: { name: "asc" },
  });

  const parsedCardTemplates = cardTemplates.map(c => ({
    id: c.id,
    name: c.name,
    price: Number(c.price),
    value: Number(c.value),
  }));

  // 3. Fetch all staff members
  const staffMembers = await db.staff.findMany({
    orderBy: { fullName: "asc" },
  });

  const parsedStaff = staffMembers.map(st => ({
    id: st.id,
    fullName: st.fullName,
  }));

  // Calculate card balances breakdown dynamically
  const parsedCards = customer.cards.map((card) => {
    const curBalance = Number(card.currentBalance);
    const origPrice = Number(card.originalPrice);
    const origValue = Number(card.originalValue);
    
    const ratioReal = origPrice / origValue;
    const realBalance = Math.round(curBalance * ratioReal);
    const promoBalance = curBalance - realBalance;

    return {
      id: card.id,
      name: card.template.name,
      currentBalance: curBalance,
      originalPrice: origPrice,
      originalValue: origValue,
      realBalance,
      promoBalance,
      template: {
        name: card.template.name,
      },
    };
  });

  return (
    <div className={styles.container}>
      <header>
        <Link href="/staff/customers" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Quay lại danh sách khách hàng</span>
        </Link>
      </header>

      {/* Profile Header section */}
      <section className={styles.profileCard}>
        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{customer.fullName}</h1>
            <span className={`${styles.badge} ${styles.badgeGold}`} style={{ fontSize: "0.85rem", padding: "0.35rem 0.85rem" }}>
              {customer.tier}
            </span>
            <span className={`${styles.badge} ${customer.status === "active" ? styles.badgeActive : styles.badgeInactive}`} style={{ fontSize: "0.85rem", padding: "0.35rem 0.85rem", marginLeft: "0.5rem" }}>
              {customer.status === "active" ? "Đang hoạt động" : "Không còn nhu cầu"}
            </span>
            {totalDebt > 0 && (
              <span className={`${styles.badge} ${styles.badgeDebt}`} style={{ fontSize: "0.85rem", padding: "0.35rem 0.85rem", marginLeft: "0.5rem" }}>
                Nợ: {formatVND(totalDebt)}
              </span>
            )}
          </div>

          <div className={styles.infoGrid}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Phone size={16} style={{ color: "var(--text-secondary)" }} />
              <div>
                <div className={styles.infoLabel}>Số điện thoại</div>
                <div className={styles.infoValue}>{customer.phone}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar size={16} style={{ color: "var(--text-secondary)" }} />
              <div>
                <div className={styles.infoLabel}>Ngày sinh</div>
                <div className={styles.infoValue}>
                  {customer.dob ? new Date(customer.dob).toLocaleDateString("vi-VN") : "Chưa có"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={16} style={{ color: "var(--text-secondary)" }} />
              <div>
                <div className={styles.infoLabel}>Số CCCD</div>
                <div className={styles.infoValue}>{customer.cccd || "Chưa có"}</div>
              </div>
            </div>
          </div>

          {customer.address && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              <MapPin size={16} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
              <div>
                <span className={styles.infoLabel}>Địa chỉ: </span>
                <span className={styles.infoValue} style={{ fontWeight: "normal" }}>{customer.address}</span>
              </div>
            </div>
          )}

          {customer.notes && (
            <div className={styles.notesBox}>
              <strong style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Ghi chú y tế / Da liễu:</strong>
              {customer.notes}
            </div>
          )}
        </div>

        {/* Actions section */}
        <div className={styles.actionsSection} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignSelf: "center" }}>
          <RecordUsageModal
            customerId={customer.id}
            cards={parsedCards}
            treatments={customer.treatments.map(t => ({
              id: t.id,
              usedSessions: t.usedSessions,
              totalSessions: t.totalSessions,
              service: { id: t.service.id, name: t.service.name },
            }))}
            services={parsedServices}
            staffMembers={parsedStaff}
          />
          <EditCustomerModal
            customer={{
              id: customer.id,
              fullName: customer.fullName,
              phone: customer.phone,
              dob: customer.dob ? customer.dob.toISOString() : null,
              gender: customer.gender,
              cccd: customer.cccd,
              address: customer.address,
              notes: customer.notes,
              status: customer.status,
            }}
          />
          <DeleteCustomerButton
            customerId={customer.id}
            customerName={customer.fullName}
          />
        </div>
      </section>

      {/* Cards and Treatments sections */}
      <section className={styles.sectionGrid}>
        <div className={styles.cardSection}>
          <h3 className={styles.sectionTitle}>Tài khoản thẻ & Liệu trình đang sở hữu</h3>
          
          <div className={styles.cardsGrid} style={{ marginBottom: "1.5rem" }}>
            {parsedCards.map((card) => (
              <div key={card.id} className={styles.walletCard}>
                <div className={styles.cardTitle}>{card.name}</div>
                <div className={styles.balanceRow}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>Số dư tổng:</span>
                  <span className={styles.balanceVal}>{formatVND(card.currentBalance)}</span>
                </div>
                <div className={styles.breakdown}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Số dư mua thật:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{formatVND(card.realBalance)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Số dư được tặng:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{formatVND(card.promoBalance)}</strong>
                  </div>
                </div>
              </div>
            ))}

            {customer.treatments.map((treatment) => {
              const progress = Math.round((treatment.usedSessions / treatment.totalSessions) * 100);
              return (
                <div key={treatment.id} className={styles.walletCard} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div className={styles.cardTitle}>{treatment.service.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Giá mua: <strong>{formatVND(treatment.pricePaid)}</strong>
                    </div>
                  </div>

                  <div className={styles.progressContainer}>
                    <div className={styles.progressLabel}>
                      <span>Tiến trình sử dụng:</span>
                      <strong>{treatment.usedSessions}/{treatment.totalSessions} buổi</strong>
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {parsedCards.length === 0 && customer.treatments.length === 0 && (
              <div className={styles.emptyText} style={{ gridColumn: "span 3" }}>
                Khách hàng này hiện chưa mua thẻ tài khoản hoặc gói liệu trình nào.
              </div>
            )}
          </div>
        </div>

        {/* Usage Logs section */}
        <div className={styles.cardSection}>
          <h3 className={styles.sectionTitle}>Nhật ký sử dụng dịch vụ gần đây</h3>
          <div style={{ overflowX: "auto" }}>
            {customer.usageLogs.length === 0 ? (
              <div className={styles.emptyText}>Chưa có ghi nhận sử dụng dịch vụ nào.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Thời gian</th>
                    <th className={styles.th}>Dịch vụ</th>
                    <th className={styles.th}>Trừ thẻ/Buổi</th>
                    <th className={styles.th}>Kỹ thuật viên</th>
                    <th className={styles.th}>Người ghi nhận</th>
                    <th className={styles.th}>Ghi chú buổi làm</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.usageLogs.map((log) => (
                    <tr key={log.id} className={styles.tr}>
                      <td className={styles.td}>
                        {new Date(log.usedAt).toLocaleString("vi-VN")}
                      </td>
                      <td className={styles.td} style={{ fontWeight: 600 }}>{log.service.name}</td>
                      <td className={styles.td}>
                        {log.sourceType === "card" ? (
                          <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>
                            -{formatVND(log.amountDeducted)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--accent-rose)", fontWeight: 700 }}>
                            -1 buổi
                          </span>
                        )}
                      </td>
                      <td className={styles.td}>{log.performedBy}</td>
                      <td className={styles.td}>{log.staff?.fullName || "Hệ thống"}</td>
                      <td className={styles.td} style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {log.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* Invoices and Debt Collection Section */}
      <CustomerInvoicesList
        invoices={customer.invoices}
        customer={{
          id: customer.id,
          fullName: customer.fullName,
          phone: customer.phone,
        }}
        services={parsedServices}
        cardTemplates={parsedCardTemplates}
        staff={parsedStaff}
      />
    </div>
  );
}
