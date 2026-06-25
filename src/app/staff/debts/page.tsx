import { db } from "@/lib/db";
import styles from "./page.module.css";
import { Wallet, Search, Check, Calendar, AlertCircle } from "lucide-react";
import DebtCollectionList from "./DebtCollectionList";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function DebtsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || "";

  // Query all pending installment schedules
  const pendingSchedules = await db.installmentSchedule.findMany({
    where: {
      status: "pending",
      invoice: {
        customer: q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
      },
    },
    include: {
      invoice: {
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          staff: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  // Calculate total outstanding debt
  const totalOutstanding = pendingSchedules.reduce((sum, sch) => sum + Number(sch.amount), 0);

  // Map to plain objects for safe client rendering
  const mappedSchedules = pendingSchedules.map((sch) => ({
    id: sch.id,
    dueDate: sch.dueDate.toISOString(),
    amount: Number(sch.amount),
    invoiceId: sch.invoiceId,
    customerName: sch.invoice.customer.fullName,
    customerPhone: sch.invoice.customer.phone,
    customerId: sch.invoice.customer.id,
    invoiceDate: sch.invoice.createdAt.toISOString(),
    invoiceAmount: Number(sch.invoice.finalAmount),
    cashierName: sch.invoice.staff.fullName,
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý &amp; Thu hồi công nợ</h1>
          <p className={styles.subtitle}>Ghi nhận các khoản thanh toán trả góp từ khách hàng</p>
        </div>
      </header>

      {/* Summary Card */}
      <section className={styles.summaryCard}>
        <div className={styles.iconWrapper}>
          <Wallet size={24} />
        </div>
        <div>
          <span className={styles.summaryLabel}>Tổng công nợ cần thu hồi</span>
          <h2 className={styles.summaryValue}>{totalOutstanding.toLocaleString("vi-VN")}đ</h2>
          <span className={styles.summarySub}>{pendingSchedules.length} kỳ trả góp chưa thanh toán</span>
        </div>
      </section>

      {/* Search Bar */}
      <form method="GET" action="/staff/debts" className={styles.searchBar}>
        <div className={styles.searchInputWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            name="q"
            type="text"
            className={styles.searchInput}
            placeholder="Tìm tên khách hàng hoặc số điện thoại..."
            defaultValue={q}
          />
        </div>
        <button type="submit" className={styles.searchBtn}>Tìm kiếm</button>
      </form>

      {/* Debt List Container */}
      <div className={styles.tableContainer}>
        {mappedSchedules.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={40} className={styles.emptyIcon} />
            <p className={styles.emptyText}>
              {q ? "Không tìm thấy công nợ nào phù hợp với từ khóa." : "🎉 Tuyệt vời! Hiện tại không có công nợ trả góp nào cần thu hồi."}
            </p>
          </div>
        ) : (
          <DebtCollectionList initialSchedules={mappedSchedules} />
        )}
      </div>
    </div>
  );
}
