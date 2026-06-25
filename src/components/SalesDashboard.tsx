"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/sales/page.module.css";
import { 
  Trash2, 
  User, 
  FileText, 
  Activity,
  DollarSign,
  CreditCard
} from "lucide-react";
import EditInvoiceModal from "./EditInvoiceModal";

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30"
];

interface CustomerProp {
  id: string;
  fullName: string;
  phone: string;
}

interface ServiceProp {
  id: string;
  name: string;
  price: number;
  type: string;
}

interface CardTemplateProp {
  id: string;
  name: string;
  price: number;
  value: number;
}

interface StaffProp {
  id: string;
  fullName: string;
}



interface InvoiceProp {
  id: string;
  customerId: string;
  customer: {
    fullName: string;
    phone: string;
  };
  totalAmount: any;
  discount: any;
  finalAmount: any;
  paymentType: string;
  installmentType?: string | null;
  installmentMonths?: number | null;
  paidAmountCash?: any;
  paidAmountTransfer?: any;
  paidAmountHomeCredit?: any;
  paidAmountMiraeAsset?: any;
  paidAmountDebt?: any;
  createdAt: string;
  items: {
    id: string;
    itemType: string;
    itemId: string;
    price: any;
    quantity: number;
    discount: any;
    staffId?: string | null;
  }[];
}

interface UsageLogProp {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  sourceType: string; // 'card' or 'treatment'
  amountDeducted: number;
  sessionsDeducted: number;
  performedBy: string;
  usedAt: string;
  notes?: string | null;
  staffName: string;
}

interface SalesDashboardProps {
  customers: CustomerProp[];
  services: ServiceProp[];
  cardTemplates: CardTemplateProp[];
  staff: StaffProp[];
  initialInvoices: InvoiceProp[];
  initialUsageLogs: UsageLogProp[];
  activeFilter: string;
  startDate: string;
  endDate: string;
}

export default function SalesDashboard({
  customers,
  services,
  cardTemplates,
  staff,
  initialInvoices,
  initialUsageLogs,
  activeFilter,
  startDate,
  endDate,
}: SalesDashboardProps) {
  const router = useRouter();
  
  // State for invoices and usage logs
  const [invoices, setInvoices] = useState<InvoiceProp[]>(initialInvoices);
  const [usageLogs, setUsageLogs] = useState<UsageLogProp[]>(initialUsageLogs);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    setUsageLogs(initialUsageLogs);
  }, [initialUsageLogs]);

  // Helpers to map item IDs to names
  const getItemName = (itemType: string, itemId: string) => {
    if (itemType === "card") {
      return cardTemplates.find((c) => c.id === itemId)?.name || "Thẻ nạp tài khoản";
    }
    return services.find((s) => s.id === itemId)?.name || "Dịch vụ/Sản phẩm";
  };

  // Calculate total revenue in selected range
  const dailyTotal = invoices.reduce((sum, inv) => {
    const offset = Number((inv as any).paidAmountOffset || 0);
    if (inv.paymentType === "installment") {
      if (inv.installmentType === "counter") {
        const totalDebt = (inv as any).schedules?.reduce((s: number, sch: any) => s + Number(sch.amount), 0) || 0;
        const downPayment = Math.max(0, Number(inv.finalAmount) - totalDebt - offset);
        return sum + downPayment;
      } else {
        return sum + Math.max(0, Number(inv.finalAmount) - offset);
      }
    }
    return sum + Math.max(0, Number(inv.finalAmount) - offset);
  }, 0);

  // Success handler after creating invoice or recording service usage
  const handleInvoiceSuccess = () => {
    router.refresh();
  };

  // Delete invoice handler
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa/hủy hóa đơn này? Hành động này sẽ thu hồi các thẻ nạp/buổi liệu trình đã cấp và hoàn trả lại phân hạng khách hàng.")) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa hóa đơn");
      
      handleInvoiceSuccess();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getFilterText = () => {
    switch (activeFilter) {
      case "today": return "Hôm nay";
      case "yesterday": return "Hôm qua";
      case "7days": return "7 ngày qua";
      case "month": return "Tháng này";
      case "custom": return `Từ ${new Date(startDate).toLocaleDateString("vi-VN")} đến ${new Date(endDate).toLocaleDateString("vi-VN")}`;
      default: return "Hôm nay";
    }
  };



  // Group invoices and usage logs by customer to display them in a unified table
  const combinedActivities = (() => {
    const map = new Map<string, {
      customerId: string;
      customerName: string;
      customerPhone: string;
      invoices: InvoiceProp[];
      usageLogs: UsageLogProp[];
    }>();

    // Group invoices
    invoices.forEach((inv) => {
      const cid = inv.customerId;
      if (!map.has(cid)) {
        map.set(cid, {
          customerId: cid,
          customerName: inv.customer.fullName,
          customerPhone: inv.customer.phone,
          invoices: [],
          usageLogs: [],
        });
      }
      map.get(cid)!.invoices.push(inv);
    });

    // Group usage logs
    usageLogs.forEach((log) => {
      const cid = log.customerId;
      if (!map.has(cid)) {
        map.set(cid, {
          customerId: cid,
          customerName: log.customerName,
          customerPhone: log.customerPhone,
          invoices: [],
          usageLogs: [],
        });
      }
      map.get(cid)!.usageLogs.push(log);
    });

    // Convert to array and determine the latest activity time for sorting
    return Array.from(map.values()).map((act) => {
      let latestTime = new Date(0);
      act.invoices.forEach((inv) => {
        const d = new Date(inv.createdAt);
        if (d > latestTime) latestTime = d;
      });
      act.usageLogs.forEach((log) => {
        const d = new Date(log.usedAt);
        if (d > latestTime) latestTime = d;
      });

      return {
        ...act,
        latestTime,
      };
    }).sort((a, b) => b.latestTime.getTime() - a.latestTime.getTime());
  })();

  return (
    <div className={styles.dashboardContainer}>
      {error && (
        <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "1rem", borderRadius: "4px", fontSize: "0.95rem", fontWeight: "600", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* SECTION 1: TODAY STATS & SALES LIST */}
      <div className={styles.statsSummaryGrid}>
        {/* Total Revenue Card */}
        <div className={styles.summaryValueCard}>
          <div className={styles.statIcon} style={{ background: "rgba(197, 160, 89, 0.15)", color: "var(--accent-gold)" }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span className={styles.statLabel}>Thực thu bán hàng ({getFilterText()})</span>
            <h2 className={styles.statValue}>{dailyTotal.toLocaleString("vi-VN")}đ</h2>
            <span className={styles.statSublabel}>Tổng doanh thu bán lẻ thực tế đã thu</span>
          </div>
        </div>

        {/* Total Invoices count Card */}
        <div className={styles.summaryValueCard}>
          <div className={styles.statIcon} style={{ background: "rgba(40, 167, 69, 0.15)", color: "#28a745" }}>
            <FileText size={24} />
          </div>
          <div>
            <span className={styles.statLabel}>Lượt hóa đơn lập mới</span>
            <h2 className={styles.statValue}>{invoices.length} hóa đơn</h2>
            <span className={styles.statSublabel}>Giao dịch thanh toán được hoàn tất</span>
          </div>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        padding: "1rem 1.5rem",
        boxShadow: "var(--shadow-sm)",
        marginBottom: "0.5rem"
      }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href={`?filter=today`} style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: activeFilter === "today" ? "white" : "var(--text-secondary)",
            background: activeFilter === "today" ? "var(--grad-premium)" : "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            boxShadow: activeFilter === "today" ? "0 2px 8px rgba(197,160,89,0.2)" : "none"
          }}>Hôm nay</a>
          <a href={`?filter=yesterday`} style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: activeFilter === "yesterday" ? "white" : "var(--text-secondary)",
            background: activeFilter === "yesterday" ? "var(--grad-premium)" : "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            boxShadow: activeFilter === "yesterday" ? "0 2px 8px rgba(197,160,89,0.2)" : "none"
          }}>Hôm qua</a>
          <a href={`?filter=7days`} style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: activeFilter === "7days" ? "white" : "var(--text-secondary)",
            background: activeFilter === "7days" ? "var(--grad-premium)" : "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            boxShadow: activeFilter === "7days" ? "0 2px 8px rgba(197,160,89,0.2)" : "none"
          }}>7 ngày</a>
          <a href={`?filter=month`} style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: activeFilter === "month" ? "white" : "var(--text-secondary)",
            background: activeFilter === "month" ? "var(--grad-premium)" : "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
            boxShadow: activeFilter === "month" ? "0 2px 8px rgba(197,160,89,0.2)" : "none"
          }}>1 tháng</a>
        </div>
        <form method="GET" action="/staff/sales" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input type="hidden" name="filter" value="custom" />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)"
              }}
              required
            />
            <span>đến</span>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)"
              }}
              required
            />
          </div>
          <button type="submit" style={{
            padding: "0.35rem 1rem",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: "white",
            background: "var(--text-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer"
          }}>Lọc</button>
        </form>
      </div>

      {/* UNIFIED INTEGRATED SALES & SERVICE USAGES TABLE */}
      <div className={styles.sectionCard} style={{ marginTop: "1rem" }}>
        <h3 className={styles.sectionTitle}>
          <Activity size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
          Nhật ký hoạt động trong ngày (Khách mua & Sử dụng dịch vụ)
        </h3>

        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          {combinedActivities.length === 0 ? (
            <div className={styles.emptyText}>Chưa ghi nhận hoạt động giao dịch hay sử dụng dịch vụ nào trong thời gian này.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "220px" }}>Khách hàng & Thời gian</th>
                  <th>Hóa đơn mua mới</th>
                  <th>Dịch vụ sử dụng</th>
                  <th style={{ textAlign: "right", width: "160px" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {combinedActivities.map((act) => {
                  const formattedTime = act.latestTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                  const formattedDate = act.latestTime.toLocaleDateString("vi-VN");
                  
                  return (
                    <tr key={act.customerId}>
                      {/* Customer Info & Time */}
                      <td style={{ verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                          <User size={16} style={{ color: "var(--text-secondary)", marginTop: "0.2rem" }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{act.customerName}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>{act.customerPhone}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--accent-gold)", fontWeight: "600", marginTop: "0.35rem" }}>
                              Gần nhất: {formattedTime} ({formattedDate})
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Purchased Invoices */}
                      <td style={{ verticalAlign: "top" }}>
                        {act.invoices.length === 0 ? (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic" }}>(Không mua mới)</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {act.invoices.map((inv) => (
                              <div key={inv.id} style={{ padding: "0.5rem 0.75rem", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                                <div className={styles.salesItemList}>
                                  {inv.items.map((item) => {
                                    const itemPrice = Number(item.price);
                                    const itemDisc = Number(item.discount || 0);
                                    const subtotal = Math.max((itemPrice * item.quantity) - itemDisc, 0);
                                    return (
                                      <div key={item.id} className={styles.salesItemTag} style={{ fontSize: "0.85rem" }}>
                                        • {getItemName(item.itemType, item.itemId)}{" "}
                                        <span style={{ color: "var(--text-secondary)" }}>
                                          (x{item.quantity})
                                        </span>
                                        <span style={{ marginLeft: "0.25rem", fontWeight: 600, color: "var(--accent-gold)" }}>
                                          - {subtotal.toLocaleString("vi-VN")}đ
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border-color)", paddingTop: "0.35rem", marginTop: "0.35rem", fontSize: "0.8rem" }}>
                                  <span style={{ fontWeight: 700, color: "var(--accent-gold)" }}>
                                    Tổng: {Number(inv.finalAmount).toLocaleString("vi-VN")}đ
                                  </span>
                                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: "500", background: "var(--bg-secondary)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                                    {(() => {
                                      const cash = Number(inv.paidAmountCash || 0);
                                      const transfer = Number(inv.paidAmountTransfer || 0);
                                      const hc = Number(inv.paidAmountHomeCredit || 0);
                                      const ma = Number(inv.paidAmountMiraeAsset || 0);
                                      const debt = Number(inv.paidAmountDebt || 0);
                                      const parts = [];
                                      if (cash > 0) parts.push(`Mặt`);
                                      if (transfer > 0) parts.push(`CK`);
                                      if (hc > 0) parts.push(`Home`);
                                      if (ma > 0) parts.push(`Mirae`);
                                      if (debt > 0) parts.push(`Nợ`);
                                      return parts.join("+") || (inv.paymentType === "installment" ? "Trả góp" : "Khác");
                                    })()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Service Usages */}
                      <td style={{ verticalAlign: "top" }}>
                        {act.usageLogs.length === 0 ? (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic" }}>(Không sử dụng)</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {act.usageLogs.map((log) => (
                              <div key={log.id} style={{ padding: "0.5rem 0.75rem", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{log.serviceName}</div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                  <span>
                                    Trực tiếp trừ: {log.sourceType === "card" ? (
                                      <span style={{ color: "var(--accent-gold)", fontWeight: "700" }}>
                                        {log.amountDeducted.toLocaleString("vi-VN")}đ
                                      </span>
                                    ) : (
                                      <span style={{ color: "var(--accent-rose)", fontWeight: "700" }}>
                                        {log.sessionsDeducted} buổi
                                      </span>
                                    )}
                                  </span>
                                  <span>KTV: <strong style={{ color: "var(--text-primary)" }}>{log.performedBy}</strong></span>
                                </div>
                                {log.notes && (
                                  <div style={{ fontSize: "0.75rem", color: "var(--accent-gold)", fontStyle: "italic", marginTop: "0.2rem", borderTop: "1px dashed var(--border-color)", paddingTop: "0.15rem" }}>
                                    "{log.notes}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right", verticalAlign: "top" }}>
                        {act.invoices.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-end" }}>
                            {act.invoices.map((inv) => (
                              <div key={inv.id} style={{ display: "flex", gap: "0.35rem" }}>
                                <EditInvoiceModal
                                  invoice={inv}
                                  services={services}
                                  cardTemplates={cardTemplates}
                                  staff={staff}
                                  onSuccess={handleInvoiceSuccess}
                                />
                                <button
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  disabled={loading}
                                  className={`${styles.actionBtnSmall} ${styles.btnDangerOutline}`}
                                  style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                                  title="Xóa hóa đơn"
                                >
                                  <Trash2 size={12} /> Xóa
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontStyle: "italic" }}>Ghi nhận từ thẻ/liệu trình</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
