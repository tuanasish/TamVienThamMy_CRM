"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Check, Calendar, User, FileText, Loader2 } from "lucide-react";

interface Schedule {
  id: string;
  dueDate: string;
  amount: number;
  invoiceId: string;
  customerName: string;
  customerPhone: string;
  customerId: string;
  invoiceDate: string;
  invoiceAmount: number;
  cashierName: string;
}

interface DebtCollectionListProps {
  initialSchedules: Schedule[];
}

export default function DebtCollectionList({ initialSchedules }: DebtCollectionListProps) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleCollectDebt = async (scheduleId: string) => {
    if (!confirm("Bạn có chắc chắn muốn ghi nhận thu nợ cho kỳ trả góp này?")) return;
    
    setProcessingId(scheduleId);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(`/api/invoices/installments/${scheduleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "paid" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ghi nhận thu nợ thất bại");
      }

      setSuccessMsg("Ghi nhận thu nợ thành công. Dòng tiền đã được hạch toán vào doanh thu thực tế.");
      
      // Remove from local state
      setSchedules(schedules.filter((s) => s.id !== scheduleId));
      
      // Refresh page data
      router.refresh();
      
      // Clear success message after 3s
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.message || "Lỗi hệ thống khi ghi nhận thu nợ");
    } finally {
      setProcessingId(null);
    }
  };

  const formatVND = (value: number) => {
    return value.toLocaleString("vi-VN") + "đ";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className={styles.wrapper}>
      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {successMsg && (
        <div className={styles.successBox}>
          {successMsg}
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Thông tin hóa đơn</th>
            <th>Hạn thanh toán</th>
            <th style={{ textAlign: "right" }}>Số tiền nợ</th>
            <th style={{ textAlign: "right" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((sch) => {
            const isOverdue = new Date(sch.dueDate) < new Date();
            const isProcessing = processingId === sch.id;

            return (
              <tr key={sch.id} className={styles.tr}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div className={styles.userIconWrapper}>
                      <User size={16} />
                    </div>
                    <div>
                      <div className={styles.customerName}>{sch.customerName}</div>
                      <div className={styles.customerPhone}>{sch.customerPhone}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.invoiceInfo}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <FileText size={14} style={{ color: "var(--accent-gold)" }} />
                      <span>Hóa đơn: <strong>{formatVND(sch.invoiceAmount)}</strong></span>
                    </div>
                    <div className={styles.invoiceMeta}>
                      Ngày lập: {formatDate(sch.invoiceDate)} | Thu ngân: {sch.cashierName}
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.dueDateWrapper}>
                    <Calendar size={14} style={{ marginRight: "0.25rem", color: "var(--text-secondary)" }} />
                    <span className={isOverdue ? styles.overdue : ""}>
                      {formatDate(sch.dueDate)}
                      {isOverdue && <span className={styles.overdueBadge}>Quá hạn</span>}
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className={styles.debtAmount}>{formatVND(sch.amount)}</div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => handleCollectDebt(sch.id)}
                    disabled={isProcessing}
                    className={`${styles.collectBtn} ${isProcessing ? styles.disabled : ""}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={14} className={styles.spinner} />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Thu nợ</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
