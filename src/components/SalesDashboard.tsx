"use client";

import { useState } from "react";
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

interface CustomerProp {
  id: string;
  fullName: string;
  phone: string;
}

interface ServiceProp {
  id: string;
  name: string;
  price: number;
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
  createdAt: string;
  items: {
    id: string;
    itemType: string;
    itemId: string;
    price: any;
    quantity: number;
  }[];
}

interface SalesDashboardProps {
  customers: CustomerProp[];
  services: ServiceProp[];
  cardTemplates: CardTemplateProp[];
  staff: StaffProp[];
  initialAppointments: AppointmentProp[];
  initialInvoices: InvoiceProp[];
}

export default function SalesDashboard({
  customers,
  services,
  cardTemplates,
  staff,
  initialAppointments,
  initialInvoices,
}: SalesDashboardProps) {
  const router = useRouter();
  
  // State for appointments and invoices
  const [appointments, setAppointments] = useState<AppointmentProp[]>(initialAppointments);
  const [invoices, setInvoices] = useState<InvoiceProp[]>(initialInvoices);
  
  // State for Modal
  const [activeAppointment, setActiveAppointment] = useState<AppointmentProp | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  // State for new appointment booking
  const [newApptCustomer, setNewApptCustomer] = useState("");
  const [newApptTime, setNewApptTime] = useState("");
  const [newApptNotes, setNewApptNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helpers to map item IDs to names
  const getItemName = (itemType: string, itemId: string) => {
    if (itemType === "card") {
      return cardTemplates.find((c) => c.id === itemId)?.name || "Thẻ nạp tài khoản";
    }
    return services.find((s) => s.id === itemId)?.name || "Dịch vụ/Sản phẩm";
  };

  // Calculate total revenue today
  const dailyTotal = invoices.reduce((sum, inv) => sum + Number(inv.finalAmount), 0);

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

      // Update state locally
      setAppointments(
        appointments.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: "checked_in" } : appt
        )
      );
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

      // Update state locally
      setAppointments(
        appointments.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: "cancelled" } : appt
        )
      );
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
    if (!newApptCustomer || !newApptTime) {
      setError("Vui lòng chọn khách hàng và thời gian hẹn");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: newApptCustomer,
          dateTime: newApptTime,
          notes: newApptNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu lịch hẹn");

      // Fetch fresh list for today
      const todayRes = await fetch("/api/appointments");
      const todayData = await todayRes.json();
      if (todayRes.ok) {
        setAppointments(todayData);
      }

      setNewApptCustomer("");
      setNewApptTime("");
      setNewApptNotes("");
      setShowAppointmentModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success handler after creating invoice
  const handleInvoiceSuccess = async () => {
    setShowInvoiceModal(false);
    setActiveAppointment(null);
    setLoading(true);
    try {
      // Refresh local states
      const [apptRes, invRes] = await Promise.all([
        fetch("/api/appointments"),
        fetch("/api/invoices"), // we could add date filters but let's fetch list
      ]);
      
      const appts = await apptRes.json();
      const invs = await invRes.json();
      
      if (apptRes.ok) setAppointments(appts);
      
      // Filter today's invoices
      if (invRes.ok) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        const filteredInvs = invs.filter((inv: any) => {
          const cDate = new Date(inv.createdAt);
          return cDate >= todayStart && cDate <= todayEnd;
        });
        setInvoices(filteredInvs);
      }
      
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        {/* Total Today Revenue Card */}
        <div className={styles.summaryValueCard}>
          <div className={styles.statIcon} style={{ background: "rgba(197, 160, 89, 0.15)", color: "var(--accent-gold)" }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span className={styles.statLabel}>Doanh thu hôm nay</span>
            <h2 className={styles.statValue}>{dailyTotal.toLocaleString("vi-VN")}đ</h2>
            <span className={styles.statSublabel}>Tổng thu nhập thực tế trong ngày</span>
          </div>
        </div>

        {/* Total Invoices count Card */}
        <div className={styles.summaryValueCard}>
          <div className={styles.statIcon} style={{ background: "rgba(40, 167, 69, 0.15)", color: "#28a745" }}>
            <FileText size={24} />
          </div>
          <div>
            <span className={styles.statLabel}>Số lượng hóa đơn</span>
            <h2 className={styles.statValue}>{invoices.length} lượt</h2>
            <span className={styles.statSublabel}>Hóa đơn thanh toán hoàn tất hôm nay</span>
          </div>
        </div>
      </div>

      <div className={styles.gridContainer}>
        {/* LEFT COLUMN: TODAY'S APPOINTMENTS */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeaderFlex}>
            <h3 className={styles.sectionTitle}>
              <Calendar size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
              Lịch hẹn hôm nay ({appointments.length})
            </h3>
            <button 
              onClick={() => setShowAppointmentModal(true)} 
              className={styles.actionBtnSmall}
              style={{ background: "var(--grad-premium)", color: "white", padding: "0.4rem 0.8rem", borderRadius: "4px", fontWeight: "700" }}
            >
              <Plus size={14} style={{ marginRight: "0.25rem" }} /> Đặt lịch hẹn
            </button>
          </div>

          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            {appointments.length === 0 ? (
              <div className={styles.emptyText}>Chưa có lịch hẹn nào được đăng ký hôm nay.</div>
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
                          {appt.status === "pending" && <span className={`${styles.badge} ${styles.badgePending}`}>Chờ khách đến</span>}
                          {appt.status === "checked_in" && <span className={`${styles.badge} ${styles.badgeCheckedIn}`}>Đã Check-in</span>}
                          {appt.status === "completed" && <span className={`${styles.badge} ${styles.badgeCompleted}`}>Đã xong</span>}
                          {appt.status === "cancelled" && <span className={`${styles.badge} ${styles.badgeCancelled}`}>Đã hủy</span>}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                            {appt.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleCheckIn(appt.id)}
                                  disabled={loading}
                                  className={styles.actionBtnSmall}
                                  style={{ background: "#28a745", color: "white" }}
                                  title="Check in cho khách"
                                >
                                  <Check size={14} /> Check in
                                </button>
                                <button
                                  onClick={() => handleCancelAppointment(appt.id)}
                                  disabled={loading}
                                  className={styles.actionBtnSmall}
                                  style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--accent-rose)" }}
                                  title="Hủy lịch hẹn"
                                >
                                  Hủy
                                </button>
                              </>
                            )}
                            {appt.status === "checked_in" && (
                              <button
                                onClick={() => {
                                  setActiveAppointment(appt);
                                  setShowInvoiceModal(true);
                                }}
                                className={styles.actionBtnSmall}
                                style={{ background: "var(--grad-premium)", color: "white" }}
                                title="Tạo hóa đơn cho khách"
                              >
                                <FileText size={14} /> Tạo hóa đơn
                              </button>
                            )}
                            {(appt.status === "completed" || appt.status === "cancelled") && (
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                Không có
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

        {/* RIGHT COLUMN: TODAY'S STATISTICS 3-COLUMN TABLE */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>
            <Activity size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
            Thống kê doanh số bán hàng trong ngày
          </h3>

          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            {invoices.length === 0 ? (
              <div className={styles.emptyText}>Chưa ghi nhận hóa đơn bán lẻ nào hôm nay.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Mặt hàng mua</th>
                    <th style={{ textAlign: "right" }}>Thanh toán</th>
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
                          {inv.items.map((item) => (
                            <div key={item.id} className={styles.salesItemTag}>
                              • {getItemName(item.itemType, item.itemId)}{" "}
                              <span style={{ color: "var(--text-secondary)" }}>
                                (x{item.quantity})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700", color: "var(--accent-gold)" }}>
                        {Number(inv.finalAmount).toLocaleString("vi-VN")}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

              <div className={styles.formGroup}>
                <label className={styles.label}>Thời gian hẹn *</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={newApptTime}
                  onChange={(e) => setNewApptTime(e.target.value)}
                  required
                />
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
    </div>
  );
}
