"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/sales/page.module.css";
import { 
  Plus, 
  Check, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Activity,
  DollarSign,
  X,
  CreditCard
} from "lucide-react";
import CreateInvoiceForm from "./CreateInvoiceForm";
import EditInvoiceModal from "./EditInvoiceModal";
import SalesRecordUsageModal from "./SalesRecordUsageModal";

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

interface AppointmentProp {
  id: string;
  customerId: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
  };
  dateTime: string;
  status: string; // 'pending', 'checked_in', 'completed', 'cancelled'
  notes?: string | null;
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
  initialAppointments: AppointmentProp[];
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
  initialAppointments,
  initialInvoices,
  initialUsageLogs,
  activeFilter,
  startDate,
  endDate,
}: SalesDashboardProps) {
  const router = useRouter();
  
  // State for appointments, invoices, and usage logs
  const [appointments, setAppointments] = useState<AppointmentProp[]>(initialAppointments);
  const [invoices, setInvoices] = useState<InvoiceProp[]>(initialInvoices);
  const [usageLogs, setUsageLogs] = useState<UsageLogProp[]>(initialUsageLogs);
  
  // State for Modal
  const [activeAppointment, setActiveAppointment] = useState<AppointmentProp | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showCheckInSuccessModal, setShowCheckInSuccessModal] = useState(false);
  const [checkInSuccessAppt, setCheckInSuccessAppt] = useState<AppointmentProp | null>(null);
  
  // State for new appointment booking
  const [newApptCustomer, setNewApptCustomer] = useState("");
  const [newApptDate, setNewApptDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [newApptTime, setNewApptTime] = useState("09:00");
  const [newApptNotes, setNewApptNotes] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync state with server-rendered props when filters or database updates trigger new props
  useEffect(() => {
    setAppointments(initialAppointments);
  }, [initialAppointments]);

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

  // Check in handler
  const handleCheckIn = async (appointmentId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "checked_in" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể check-in");

      // Find the appointment to show in the check-in success modal
      const appt = appointments.find((a) => a.id === appointmentId);
      if (appt) {
        setCheckInSuccessAppt(appt);
        setShowCheckInSuccessModal(true);
      }

      // Trigger router refresh to pull updated database states
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment handler
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy lịch hẹn này?")) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể hủy lịch");

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick book appointment handler
  const handleQuickBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApptCustomer || !newApptDate || !newApptTime) {
      setError("Vui lòng chọn khách hàng, ngày hẹn và giờ hẹn");
      return;
    }
    if (isNewCustomer && (!newCustomerName || !newCustomerPhone)) {
      setError("Vui lòng nhập đầy đủ tên và số điện thoại của khách hàng mới");
      return;
    }

    setLoading(true);
    setError("");
    try {
      let finalCustomerId = newApptCustomer;

      // 1. If it's a new customer, register them first
      if (isNewCustomer) {
        const custResponse = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: newCustomerName,
            phone: newCustomerPhone,
          }),
        });
        const custData = await custResponse.json();
        if (!custResponse.ok) {
          throw new Error(custData.error || "Không thể tạo hồ sơ khách hàng mới");
        }
        finalCustomerId = custData.id;
      }

      // 2. Create the appointment
      const dateTime = `${newApptDate}T${newApptTime}`;
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: finalCustomerId,
          dateTime,
          notes: newApptNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu lịch hẹn");

      setNewApptCustomer("");
      setNewApptDate(new Date().toLocaleDateString("sv-SE"));
      setNewApptTime("09:00");
      setNewApptNotes("");
      setIsNewCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setShowAppointmentModal(false);
      
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success handler after creating invoice or recording service usage
  const handleInvoiceSuccess = () => {
    setShowInvoiceModal(false);
    setActiveAppointment(null);
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

      <div className={styles.gridContainer}>
        {/* LEFT COLUMN: APPOINTMENTS */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeaderFlex}>
            <h3 className={styles.sectionTitle}>
              <Calendar size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
              Lịch hẹn đăng ký ({appointments.length})
            </h3>
            <button 
              onClick={() => {
                setNewApptCustomer("");
                setNewApptDate(new Date().toLocaleDateString("sv-SE"));
                setNewApptTime("09:00");
                setNewApptNotes("");
                setIsNewCustomer(false);
                setNewCustomerName("");
                setNewCustomerPhone("");
                setShowAppointmentModal(true);
              }} 
              className={`${styles.actionBtnSmall} ${styles.btnPrimary}`}
            >
              <Plus size={14} style={{ marginRight: "0.25rem" }} /> Đặt lịch hẹn
            </button>
          </div>

          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            {appointments.length === 0 ? (
              <div className={styles.emptyText}>Chưa có lịch hẹn nào được ghi nhận trong thời gian này.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Giờ hẹn</th>
                    <th>Khách hàng</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => {
                    const dateObj = new Date(appt.dateTime);
                    const formattedTime = dateObj.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    });
                    
                    return (
                      <tr key={appt.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: "700" }}>
                            <Clock size={14} style={{ color: "var(--accent-gold)" }} />
                            {formattedTime}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                            {dateObj.toLocaleDateString("vi-VN")}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{appt.customer.fullName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{appt.customer.phone}</div>
                          {appt.notes && (
                            <div style={{ fontSize: "0.75rem", color: "var(--accent-gold)", fontStyle: "italic", marginTop: "0.15rem" }}>
                              "{appt.notes}"
                            </div>
                          )}
                        </td>
                        <td>
                          {appt.status === "pending" && <span className={`${styles.badge} ${styles.badgePending}`}>Chờ đến</span>}
                          {appt.status === "checked_in" && <span className={`${styles.badge} ${styles.badgeCheckedIn}`}>Đã đến</span>}
                          {appt.status === "completed" && <span className={`${styles.badge} ${styles.badgeCompleted}`}>Hoàn tất</span>}
                          {appt.status === "cancelled" && <span className={`${styles.badge} ${styles.badgeCancelled}`}>Đã hủy</span>}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {appt.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleCheckIn(appt.id)}
                                  disabled={loading}
                                  className={`${styles.actionBtnSmall} ${styles.btnSuccess}`}
                                  title="Check in cho khách"
                                >
                                  <Check size={14} /> Check in
                                </button>
                                <button
                                  onClick={() => handleCancelAppointment(appt.id)}
                                  disabled={loading}
                                  className={`${styles.actionBtnSmall} ${styles.btnDangerOutline}`}
                                  title="Hủy lịch hẹn"
                                >
                                  Hủy
                                </button>
                              </>
                            )}
                            {appt.status === "checked_in" && (
                              <>
                                <SalesRecordUsageModal
                                  customerId={appt.customerId}
                                  customerName={appt.customer.fullName}
                                  services={services}
                                  staffMembers={staff}
                                  onSuccess={handleInvoiceSuccess}
                                  triggerId={`btn-use-service-${appt.customerId}`}
                                />
                                <button
                                  onClick={() => {
                                    setActiveAppointment(appt);
                                    setShowInvoiceModal(true);
                                  }}
                                  className={`${styles.actionBtnSmall} ${styles.btnPrimary}`}
                                  title="Tạo hóa đơn cho khách"
                                >
                                  <FileText size={14} /> Tạo hóa đơn
                                </button>
                              </>
                            )}
                            {(appt.status === "completed" || appt.status === "cancelled") && (
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                Đã xử lý
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RETAIL SALES & SERVICE USAGES */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* TODAY'S SALES INVOICES */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>
              <CreditCard size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
              Hóa đơn bán hàng cấp mới ({invoices.length})
            </h3>

            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              {invoices.length === 0 ? (
                <div className={styles.emptyText}>Chưa ghi nhận hóa đơn bán lẻ nào trong thời gian này.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Mặt hàng mua</th>
                      <th style={{ textAlign: "right" }}>Thanh toán</th>
                      <th style={{ textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <User size={14} style={{ color: "var(--text-secondary)" }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{inv.customer.fullName}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{inv.customer.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.salesItemList}>
                            {inv.items.map((item) => {
                              const itemPrice = Number(item.price);
                              const itemDisc = Number(item.discount || 0);
                              const subtotal = Math.max((itemPrice * item.quantity) - itemDisc, 0);
                              return (
                                <div key={item.id} className={styles.salesItemTag}>
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
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: "700", color: "var(--accent-gold)" }}>
                            {Number(inv.finalAmount).toLocaleString("vi-VN")}đ
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                            {(() => {
                              const cash = Number(inv.paidAmountCash || 0);
                              const transfer = Number(inv.paidAmountTransfer || 0);
                              const hc = Number(inv.paidAmountHomeCredit || 0);
                              const ma = Number(inv.paidAmountMiraeAsset || 0);
                              const debt = Number(inv.paidAmountDebt || 0);

                              const parts = [];
                              if (cash > 0) parts.push(`Mặt: ${cash.toLocaleString("vi-VN")}đ`);
                              if (transfer > 0) parts.push(`CK: ${transfer.toLocaleString("vi-VN")}đ`);
                              if (hc > 0) parts.push(`Home: ${hc.toLocaleString("vi-VN")}đ`);
                              if (ma > 0) parts.push(`Mirae: ${ma.toLocaleString("vi-VN")}đ`);
                              if (debt > 0) parts.push(`Nợ: ${debt.toLocaleString("vi-VN")}đ`);

                              if (parts.length === 0) {
                                return inv.paymentType === "installment"
                                  ? `Trả góp: ${
                                      inv.installmentType === "home_credit"
                                        ? "Home Credit"
                                        : inv.installmentType === "mirae_asset"
                                        ? "Mirae Asset"
                                        : "Tại quầy"
                                    }`
                                  : "Tiền mặt";
                              }
                              return parts.join(" | ");
                            })()}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
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
                              title="Xóa hóa đơn"
                            >
                              <Trash2 size={14} /> Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* TODAY'S SERVICE USAGES */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>
              <Activity size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
              Nhật ký khách hàng dùng dịch vụ ({usageLogs.length})
            </h3>

            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              {usageLogs.length === 0 ? (
                <div className={styles.emptyText}>Chưa ghi nhận lượt khách sử dụng dịch vụ nào trong thời gian này.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Dịch vụ sử dụng</th>
                      <th>Hình thức trừ</th>
                      <th>Nhân sự thực hiện</th>
                      <th style={{ textAlign: "right" }}>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogs.map((log) => {
                      const logDate = new Date(log.usedAt);
                      return (
                        <tr key={log.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{log.customerName}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{log.customerPhone}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{log.serviceName}</div>
                            {log.notes && (
                              <div style={{ fontSize: "0.75rem", color: "var(--accent-gold)", fontStyle: "italic", marginTop: "0.15rem" }}>
                                "{log.notes}"
                              </div>
                            )}
                          </td>
                          <td>
                            {log.sourceType === "card" ? (
                              <span style={{ color: "var(--accent-gold)", fontWeight: "700" }}>
                                -{log.amountDeducted.toLocaleString("vi-VN")}đ
                              </span>
                            ) : (
                              <span style={{ color: "var(--accent-rose)", fontWeight: "700" }}>
                                -{log.sessionsDeducted} buổi
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{log.performedBy} (KTV)</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Ghi nhận: {log.staffName}</div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: "700" }}>
                              {logDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                              {logDate.toLocaleDateString("vi-VN")}
                            </div>
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
      </div>

      {/* DIALOG 1: QUICK BOOK APPOINTMENT MODAL */}
      {showAppointmentModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "450px" }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 700, fontSize: "1.15rem" }}>Đặt lịch hẹn mới</h3>
              <button onClick={() => setShowAppointmentModal(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleQuickBook} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <input
                  type="checkbox"
                  id="isNewCustomerCheckbox"
                  checked={isNewCustomer}
                  onChange={(e) => {
                    setIsNewCustomer(e.target.checked);
                    if (e.target.checked) {
                      setNewApptCustomer("new-customer-placeholder");
                    } else {
                      setNewApptCustomer("");
                    }
                  }}
                  style={{ width: "16px", height: "16px", accentColor: "var(--accent-gold)", cursor: "pointer" }}
                />
                <label htmlFor="isNewCustomerCheckbox" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-gold)", cursor: "pointer" }}>
                  Khách hàng mới (chưa có hồ sơ)?
                </label>
              </div>

              {isNewCustomer ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Họ và Tên *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Nguyễn Vy"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Số điện thoại *</label>
                    <input
                      type="tel"
                      className={styles.input}
                      placeholder="0912345678"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Khách hàng *</label>
                  <select
                    className={styles.select}
                    value={newApptCustomer}
                    onChange={(e) => setNewApptCustomer(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày hẹn *</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={newApptDate}
                    onChange={(e) => setNewApptDate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giờ hẹn *</label>
                  <select
                    className={styles.select}
                    value={newApptTime}
                    onChange={(e) => setNewApptTime(e.target.value)}
                    required
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Ghi chú lịch hẹn</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Ví dụ: Liệu trình trị nám buổi 3"
                  value={newApptNotes}
                  onChange={(e) => setNewApptNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={styles.submitBtn}
                style={{ marginTop: "0.5rem" }}
              >
                Đặt lịch
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2: CREATE INVOICE MODAL */}
      {showInvoiceModal && activeAppointment && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "900px", padding: "1.5rem" }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--text-primary)" }}>
                Lập hóa đơn thanh toán cho: {activeAppointment.customer.fullName}
              </h3>
              <button 
                onClick={() => {
                  setShowInvoiceModal(false);
                  setActiveAppointment(null);
                }} 
                className={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginTop: "1rem", maxHeight: "80vh", overflowY: "auto" }}>
              <CreateInvoiceForm
                customers={customers}
                services={services}
                cardTemplates={cardTemplates}
                staff={staff}
                initialCustomerId={activeAppointment.customerId}
                appointmentId={activeAppointment.id}
                onSuccess={handleInvoiceSuccess}
                onCancel={() => {
                  setShowInvoiceModal(false);
                  setActiveAppointment(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 3: CHECK-IN SUCCESS MODAL */}
      {showCheckInSuccessModal && checkInSuccessAppt && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modalContent} style={{ maxWidth: "480px", padding: "2rem", borderRadius: "16px", background: "rgba(23, 23, 23, 0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(197, 160, 89, 0.3)", boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-1.2rem", marginRight: "-1.2rem" }}>
              <button 
                onClick={() => {
                  setShowCheckInSuccessModal(false);
                  setCheckInSuccessAppt(null);
                }} 
                className={styles.closeBtn}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.5rem" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{
                background: "rgba(45, 122, 96, 0.15)",
                border: "1px solid rgba(45, 122, 96, 0.3)",
                borderRadius: "50%",
                padding: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(45, 122, 96, 0.2)"
              }}>
                <Check size={36} style={{ color: "#34c759" }} />
              </div>
              
              <h3 style={{ fontWeight: 800, fontSize: "1.35rem", color: "var(--text-primary)", marginTop: "0.5rem", letterSpacing: "-0.02em", textAlign: "center" }}>
                Check-in Thành Công!
              </h3>
              
              <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", textAlign: "center", lineHeight: "1.6", margin: "0 0 1.25rem 0" }}>
                Khách hàng <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{checkInSuccessAppt.customer.fullName}</span> đã được xác nhận đến Spa. Hãy chọn bước tiếp theo để phục vụ khách hàng:
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
                <button
                  onClick={() => {
                    setShowCheckInSuccessModal(false);
                    setActiveAppointment(checkInSuccessAppt);
                    setShowInvoiceModal(true);
                  }}
                  className={`${styles.actionBtnSmall} ${styles.btnPrimary}`}
                  style={{
                    padding: "0.8rem 1.5rem",
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    width: "100%",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, var(--accent-gold) 0%, #b38b36 100%)",
                    color: "#000",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(197, 160, 89, 0.25)"
                  }}
                >
                  <FileText size={16} /> Lập hóa đơn mua dịch vụ mới
                </button>
                
                <button
                  onClick={() => {
                    setShowCheckInSuccessModal(false);
                    const apptCustId = checkInSuccessAppt.customerId;
                    setCheckInSuccessAppt(null);
                    setTimeout(() => {
                      const btn = document.getElementById(`btn-use-service-${apptCustId}`);
                      if (btn) {
                        (btn as HTMLButtonElement).click();
                      }
                    }, 100);
                  }}
                  className={`${styles.actionBtnSmall}`}
                  style={{
                    padding: "0.8rem 1.5rem",
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    width: "100%",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer"
                  }}
                >
                  <Activity size={16} style={{ color: "var(--accent-gold)" }} /> Ghi nhận sử dụng liệu trình (Gói cũ)
                </button>
                
                <button
                  onClick={() => {
                    setShowCheckInSuccessModal(false);
                    setCheckInSuccessAppt(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    marginTop: "0.5rem",
                    alignSelf: "center"
                  }}
                >
                  Chỉ check-in & Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
