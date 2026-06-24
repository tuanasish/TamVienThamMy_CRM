import { db } from "@/lib/db";
import styles from "./page.module.css";
import Link from "next/link";
import AddCustomerModal from "@/components/AddCustomerModal";
import { Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

const formatVND = (value: any) => {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
};

const getTierClass = (tier: string) => {
  switch (tier) {
    case "Business+":
      return styles.badgeVIPPlus;
    case "Business":
      return styles.badgeVIPPlus;
    case "VIP+":
      return styles.badgeVIPPlus;
    case "VIP":
      return styles.badgeVIP;
    case "Diamond":
      return styles.badgeGold;
    case "Gold":
      return styles.badgeGold;
    case "Silver":
      return styles.badgeSilver;
    case "Member":
      return styles.badgeMember;
    default:
      return styles.badgeNormal;
  }
};

export default async function CustomersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q || "";

  // Query customers from DB
  const customers = await db.customer.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });

  // Query all pending installment schedules to aggregate outstanding debt in 1 single query
  const pendingSchedules = await db.installmentSchedule.findMany({
    where: { status: "pending" },
    select: {
      amount: true,
      invoice: {
        select: { customerId: true }
      }
    }
  });

  // Map customerId to total debt
  const debtMap = new Map<string, number>();
  for (const s of pendingSchedules) {
    const custId = s.invoice.customerId;
    const amount = Number(s.amount);
    debtMap.set(custId, (debtMap.get(custId) || 0) + amount);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý khách hàng</h1>
        <AddCustomerModal />
      </header>

      {/* Search Bar */}
      <form method="GET" action="/staff/customers" className={styles.searchBar}>
        <input
          name="q"
          type="text"
          className={styles.searchInput}
          placeholder="Tìm tên hoặc số điện thoại..."
          defaultValue={q}
        />
        <button type="submit" className={styles.searchBtn} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Search size={16} />
          <span>Tìm</span>
        </button>
      </form>

      {/* Customer Table */}
      <div className={styles.tableContainer}>
        {customers.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Không tìm thấy hồ sơ khách hàng nào phù hợp.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Khách hàng</th>
                <th className={styles.th}>Số điện thoại</th>
                <th className={styles.th}>Hạng thành viên</th>
                <th className={styles.th}>Tổng tích lũy</th>
                <th className={styles.th}>Công nợ hiện tại</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const debt = debtMap.get(c.id) || 0;
                return (
                  <tr key={c.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 600 }}>{c.fullName}</td>
                    <td className={styles.td}>{c.phone}</td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${getTierClass(c.tier)}`}>
                        {c.tier}
                      </span>
                    </td>
                    <td className={styles.td} style={{ fontWeight: 700 }}>
                      {formatVND(c.totalSpent)}
                    </td>
                    <td className={styles.td} style={{ fontWeight: 700, color: debt > 0 ? "#dc3545" : "var(--text-secondary)" }}>
                      {debt > 0 ? formatVND(debt) : "—"}
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <Link href={`/staff/customers/${c.id}`} className={styles.actionLink}>
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
