"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditInvoiceModal from "./EditInvoiceModal";
import { Receipt, Calendar, CreditCard, CheckCircle, AlertCircle, FileText } from "lucide-react";
import styles from "@/app/staff/customers/[id]/page.module.css";

interface CustomerInvoicesListProps {
  invoices: any[];
  customer: {
    id: string;
    fullName: string;
    phone: string;
  };
  services: { id: string; name: string; price: number; type: string }[];
  cardTemplates: { id: string; name: string; price: number; value: number }[];
  staff: { id: string; fullName: string }[];
}

export default function CustomerInvoicesList({
  invoices,
  customer,
  services,
  cardTemplates,
  staff,
}: CustomerInvoicesListProps) {
  const router = useRouter();

  const formatVND = (value: any) => {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  };

  const getItemName = (itemType: string, itemId: string) => {
    if (itemType === "card") {
      return cardTemplates.find((c) => c.id === itemId)?.name || "Thẻ nạp";
    }
    return services.find((s) => s.id === itemId)?.name || "Dịch vụ/Sản phẩm";
  };

  const handleSuccess = () => {
    router.refresh(); // Refresh Next.js server components data
  };

  return (
    <div className={styles.cardSection} style={{ marginTop: "1.5rem" }}>
      <h3 className={styles.sectionTitle}>Lịch sử giao dịch & Hóa đơn</h3>

      <div style={{ overflowX: "auto" }}>
        {invoices.length === 0 ? (
          <div className={styles.emptyText}>Khách hàng này chưa có lịch sử giao dịch nào.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Mã HĐ</th>
                <th className={styles.th}>Ngày lập</th>
                <th className={styles.th}>Mặt hàng mua</th>
                <th className={styles.th}>Tổng thanh toán</th>
                <th className={styles.th}>Đã thanh toán</th>
                <th className={styles.th}>Còn nợ</th>
                <th className={styles.th}>Hình thức</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const finalAmt = Number(inv.finalAmount);
                
                // Calculate remaining debt from unpaid schedules (only for counter installment)
                const isCounter = inv.paymentType !== "installment" || inv.installmentType === "counter";
                const pendingSchedules = inv.paymentType === "installment" && inv.installmentType === "counter"
                  ? (inv.schedules?.filter((s: any) => s.status === "pending") || [])
                  : [];
                const remainingDebt = pendingSchedules.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
                const paidAmt = isCounter ? Math.max(finalAmt - remainingDebt, 0) : finalAmt;
                
                const isPaidFull = remainingDebt === 0;

                return (
                  <tr key={inv.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 600 }}>
                      {inv.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className={styles.td}>
                      {new Date(inv.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className={styles.td} style={{ fontSize: "0.85rem", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={inv.items.map((it: any) => {
                      const itPrice = Number(it.price);
                      const itDisc = Number(it.discount || 0);
                      const itSubtotal = Math.max((itPrice * it.quantity) - itDisc, 0);
                      return `${getItemName(it.itemType, it.itemId)} (x${it.quantity}) - ${itSubtotal.toLocaleString("vi-VN")}đ`;
                    }).join("\n")}>
                      {inv.items.map((it: any) => getItemName(it.itemType, it.itemId)).join(", ") || "Không rõ"}
                    </td>
                    <td className={styles.td} style={{ fontWeight: 600 }}>
                      {formatVND(finalAmt)}
                    </td>
                    <td className={styles.td} style={{ color: "#28a745", fontWeight: 600 }}>
                      {formatVND(paidAmt)}
                    </td>
                    <td className={styles.td} style={{ color: remainingDebt > 0 ? "#dc3545" : "var(--text-secondary)", fontWeight: 700 }}>
                      {remainingDebt > 0 ? formatVND(remainingDebt) : "—"}
                    </td>
                    <td className={styles.td}>
                      {inv.paymentType === "cash" ? (
                        <span style={{ fontSize: "0.8rem", background: "rgba(40,167,69,0.1)", color: "#28a745", padding: "0.2rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>
                          Trả thẳng
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.8rem", background: remainingDebt > 0 ? "rgba(220,53,69,0.1)" : "rgba(40,167,69,0.1)", color: remainingDebt > 0 ? "#dc3545" : "#28a745", padding: "0.2rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>
                          Trả góp ({inv.installmentMonths}T)
                        </span>
                      )}
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <EditInvoiceModal
                        invoice={{
                          id: inv.id,
                          customerId: customer.id,
                          customer: {
                            fullName: customer.fullName,
                            phone: customer.phone,
                          },
                          totalAmount: Number(inv.totalAmount),
                          discount: Number(inv.discount),
                          finalAmount: finalAmt,
                        }}
                        services={services}
                        cardTemplates={cardTemplates}
                        staff={staff}
                        onSuccess={handleSuccess}
                      />
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
