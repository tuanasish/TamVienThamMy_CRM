"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/appointments/page.module.css";
import {
  Search,
  Plus,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  AlertCircle,
  FileText
} from "lucide-react";
import CreateInvoiceForm from "./CreateInvoiceForm";

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
  sessions?: number;
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
  status: string;
  notes?: string | null;
}

interface AppointmentsManagerProps {
  initialAppointments: AppointmentProp[];
  customers: CustomerProp[];
  services: ServiceProp[];
  cardTemplates: CardTemplateProp[];
  staff: StaffProp[];
}

export default function AppointmentsManager({
  initialAppointments,
  customers,
  services,
  cardTemplates,
  staff,
}: AppointmentsManagerProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentProp[]>(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Invoice modal inline state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<AppointmentProp | null>(null);

  // Filters State
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
  });
  const [searchTerm, setSearchTerm] = useState("");

  const adjustDate = (days: number) => {
    const baseDate = filterDate ? new Date(filterDate) : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    setFilterDate(baseDate.toLocaleDateString("sv-SE"));
  };

  // Booking Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookCustomer, setBookCustomer] = useState("");
  const [bookCustomerSearch, setBookCustomerSearch] = useState("");
  const [showBookSuggestions, setShowBookSuggestions] = useState(false);
  const [bookDate, setBookDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [bookTime, setBookTime] = useState("09:00");
  const [bookServiceId, setBookServiceId] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  const filteredBookCustomers = customers.filter((c) => {
    const q = bookCustomerSearch.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentProp | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Display all appointments (pending, checked_in, completed, cancelled)
  const activeAppointments = appointments;

  // Search/Filter matching
  const filteredAppointments = activeAppointments.filter((appt) => {
    // 1. Date match (dateTime is ISO string, we compare date part YYYY-MM-DD)
    if (filterDate) {
      const apptDateStr = appt.dateTime.split("T")[0];
      if (apptDateStr !== filterDate) return false;
    }

    // 2. Search match (customer name or phone)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const nameMatch = appt.customer.fullName.toLowerCase().includes(lowerSearch);
      const phoneMatch = appt.customer.phone.includes(lowerSearch);
      if (!nameMatch && !phoneMatch) return false;
    }

    return true;
  });

  // Action: Check in appointment
  const handleCheckIn = async (id: string) => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "checked_in" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể Check-in");

      setAppointments(
        appointments.map((appt) => (appt.id === id ? { ...appt, status: "checked_in" } : appt))
      );
      setSuccessMsg("Đã check-in thành công! Khách hàng đã được đẩy sang quầy bán hàng.");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Action: Cancel appointment
  const handleCancel = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy lịch hẹn này?")) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể hủy lịch hẹn");

      setAppointments(
        appointments.map((appt) => (appt.id === id ? { ...appt, status: "cancelled" } : appt))
      );
      setSuccessMsg("Đã hủy lịch hẹn.");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Action: Delete appointment
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn XÓA LỊCH HẸN này khỏi hệ thống? Hành động này không thể hoàn tác.")) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa lịch hẹn");

      setAppointments(appointments.filter((appt) => appt.id !== id));
      setSuccessMsg("Đã xóa lịch hẹn thành công.");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Action: Create Appointment
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookCustomer || !bookDate || !bookTime) {
      setError("Vui lòng chọn khách hàng, ngày hẹn và giờ hẹn");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const dateTime = `${bookDate}T${bookTime}`;
      const selectedService = services.find((s) => s.id === bookServiceId);
      const apptNotes = bookServiceId
        ? (bookNotes ? `${selectedService?.name}. Ghi chú: ${bookNotes}` : `${selectedService?.name}`)
        : bookNotes;

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: bookCustomer,
          dateTime,
          notes: apptNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể đặt lịch");

      // Prepend the new appointment to the local list
      const newAppt: AppointmentProp = {
        id: data.id,
        customerId: data.customerId,
        customer: data.customer,
        dateTime: data.dateTime,
        status: data.status,
        notes: data.notes,
      };

      setAppointments([newAppt, ...appointments]);
      setSuccessMsg("Đã tạo lịch hẹn thành công!");
      
      // Reset form
      setBookCustomer("");
      setBookCustomerSearch("");
      setBookDate(new Date().toLocaleDateString("sv-SE"));
      setBookTime("09:00");
      setBookServiceId("");
      setBookNotes("");
      setShowBookModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Action: Save Edited Appointment
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt || !editDate || !editTime) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const dateTime = `${editDate}T${editTime}`;
      const response = await fetch(`/api/appointments/${editingAppt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateTime,
          notes: editNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật lịch hẹn");

      setAppointments(
        appointments.map((appt) =>
          appt.id === editingAppt.id
            ? {
                ...appt,
                dateTime: data.dateTime,
                notes: data.notes,
                status: data.status,
              }
            : appt
        )
      );

      setSuccessMsg("Đã cập nhật lịch hẹn thành công.");
      setShowEditModal(false);
      setEditingAppt(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (appt: AppointmentProp) => {
    setEditingAppt(appt);
    // Split dateTime to Date and Time parts
    const date = new Date(appt.dateTime);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISO = new Date(date.getTime() - tzOffset).toISOString();
    const [datePart, timePart] = localISO.split("T");
    setEditDate(datePart);
    setEditTime(timePart.slice(0, 5)); // HH:MM
    setEditNotes(appt.notes || "");
    setShowEditModal(true);
  };

  const clearFilters = () => {
    setFilterDate("");
    setSearchTerm("");
  };

  return (
    <div className={styles.managerContainer}>
      {/* Notifications */}
      {error && (
        <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "1rem", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ color: "#28a745", background: "rgba(40,167,69,0.1)", padding: "1rem", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontWeight: "600", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      {/* Control Bar (Filters and actions) */}
      <section className={styles.controlBar}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup} style={{ minWidth: "320px" }}>
            <label className={styles.label}>Lọc theo ngày</label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => adjustDate(-1)}
                className={styles.dateNavBtn}
                title="Ngày trước"
              >
                &larr;
              </button>
              <input
                type="date"
                className={styles.input}
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => adjustDate(1)}
                className={styles.dateNavBtn}
                title="Ngày sau"
              >
                &rarr;
              </button>
            </div>
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setFilterDate(new Date().toLocaleDateString("sv-SE"))}
                className={`${styles.dateQuickBtn} ${filterDate === new Date().toLocaleDateString("sv-SE") ? styles.activeDateQuickBtn : ""}`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setFilterDate(tomorrow.toLocaleDateString("sv-SE"));
                }}
                className={`${styles.dateQuickBtn} ${
                  filterDate === new Date(Date.now() + 86400000).toLocaleDateString("sv-SE")
                    ? styles.activeDateQuickBtn
                    : ""
                }`}
              >
                Ngày mai
              </button>
              <button
                type="button"
                onClick={() => setFilterDate("")}
                className={`${styles.dateQuickBtn} ${filterDate === "" ? styles.activeDateQuickBtn : ""}`}
              >
                Tất cả
              </button>
            </div>
          </div>

          <div style={{ alignSelf: "flex-end", height: "fit-content" }}>
            {(filterDate || searchTerm) && (
              <button onClick={clearFilters} className={styles.clearFiltersBtn}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        <div className={styles.actionRow}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm khách hàng hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              setBookCustomer("");
              setBookCustomerSearch("");
              setShowBookSuggestions(false);
              setBookDate(new Date().toLocaleDateString("sv-SE"));
              setBookTime("09:00");
              setShowBookModal(true);
            }}
            className={styles.addBtn}
          >
            <Plus size={18} /> Đặt lịch hẹn mới
          </button>
        </div>
      </section>

      {/* Table of Appointments */}
      <section className={styles.tableContainer}>
        {filteredAppointments.length === 0 ? (
          <div className={styles.emptyState}>
            Không tìm thấy lịch hẹn nào khớp với bộ lọc đang chọn.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Thời gian</th>
                <th className={styles.th}>Khách hàng</th>
                <th className={styles.th}>Ghi chú dịch vụ mong muốn</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appt) => {
                const dateObj = new Date(appt.dateTime);
                const formattedDate = dateObj.toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                const formattedTime = dateObj.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <tr key={appt.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div style={{ fontWeight: "700" }}>{formattedTime}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.15rem" }}>
                        <Clock size={12} />
                        {formattedDate}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 600 }}>{appt.customer.fullName}</div>
                        {appt.status === "checked_in" && (
                          <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "rgba(45, 122, 96, 0.15)", color: "#2d7a60", fontWeight: "bold" }}>
                            Đã đến
                          </span>
                        )}
                        {appt.status === "pending" && (
                          <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "rgba(255, 193, 7, 0.15)", color: "#b38b36", fontWeight: "bold" }}>
                            Chờ
                          </span>
                        )}
                        {appt.status === "completed" && (
                          <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "rgba(40, 167, 69, 0.15)", color: "#28a745", fontWeight: "bold" }}>
                            Hoàn tất
                          </span>
                        )}
                        {appt.status === "cancelled" && (
                          <span style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: "4px", background: "rgba(220, 53, 69, 0.15)", color: "#dc3545", fontWeight: "bold" }}>
                            Đã hủy
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{appt.customer.phone}</div>
                    </td>
                    <td className={styles.td} style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {appt.notes ? (
                        <span style={{ fontStyle: "italic", fontSize: "0.9rem" }}>"{appt.notes}"</span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Không ghi chú</span>
                      )}
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <div className={styles.btnGroup} style={{ justifyContent: "flex-end", flexWrap: "wrap", gap: "0.35rem" }}>
                        {appt.status === "pending" && (
                          <button
                            onClick={() => handleCheckIn(appt.id)}
                            disabled={loading}
                            className={styles.actionBtn}
                            style={{ background: "rgba(40, 167, 69, 0.1)", color: "#28a745", borderColor: "rgba(40, 167, 69, 0.3)" }}
                            title="Xác nhận khách tới (Check-in)"
                          >
                            <Check size={14} /> Check in
                          </button>
                        )}

                        {appt.status === "checked_in" && (
                          <button
                            onClick={() => {
                              setActiveAppointment(appt);
                              setShowInvoiceModal(true);
                            }}
                            className={styles.actionBtn}
                            style={{ background: "rgba(197, 160, 89, 0.1)", color: "var(--accent-gold)", borderColor: "rgba(197, 160, 89, 0.3)" }}
                            title="Lập hóa đơn bán lẻ cho lịch hẹn này"
                          >
                            <FileText size={14} /> Lập hóa đơn
                          </button>
                        )}

                        {(appt.status === "pending" || appt.status === "checked_in") && (
                          <button
                            onClick={() => openEditModal(appt)}
                            disabled={loading}
                            className={`${styles.actionBtn}`}
                            style={{ background: "transparent", color: "var(--accent-gold)", borderColor: "var(--border-color)" }}
                            title="Đổi lịch / Sửa ghi chú"
                          >
                            <Edit2 size={14} /> Đổi lịch
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(appt.id)}
                          disabled={loading}
                          className={`${styles.actionBtn} ${styles.btnDelete}`}
                          style={{ borderColor: "var(--border-color)" }}
                          title="Xóa lịch hẹn"
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* MODAL 1: BOOK NEW APPOINTMENT */}
      {showBookModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Đặt lịch hẹn mới</h3>
              <button onClick={() => setShowBookModal(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Khách hàng *</label>
                <div className={styles.searchDropdownContainer}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Nhập tên hoặc số điện thoại để tìm..."
                      value={bookCustomerSearch}
                      onChange={(e) => {
                        setBookCustomerSearch(e.target.value);
                        setBookCustomer(""); // clear selected id
                        setShowBookSuggestions(true);
                      }}
                      onFocus={() => setShowBookSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowBookSuggestions(false), 200)}
                      required
                      disabled={loading}
                      style={{ paddingRight: "30px" }}
                    />
                    {bookCustomerSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setBookCustomerSearch("");
                          setBookCustomer("");
                        }}
                        className={styles.inputClearBtn}
                        title="Xóa lựa chọn"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {showBookSuggestions && (
                    <div className={styles.suggestionsList}>
                      {filteredBookCustomers.length === 0 ? (
                        <div className={styles.suggestionEmpty}>
                          Không tìm thấy khách hàng nào phù hợp
                        </div>
                      ) : (
                        filteredBookCustomers.map((c) => (
                          <div
                            key={c.id}
                            className={styles.suggestionItem}
                            onMouseDown={(e) => {
                              e.preventDefault(); // prevent input blur before state change
                              setBookCustomer(c.id);
                              setBookCustomerSearch(`${c.fullName} (${c.phone})`);
                              setShowBookSuggestions(false);
                            }}
                          >
                            <span className={styles.suggestionName}>{c.fullName}</span>
                            <span className={styles.suggestionPhone}>{c.phone}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* Hidden input to enforce HTML5 validation if submitted empty */}
                <input type="hidden" value={bookCustomer} required name="customerId" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày hẹn *</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giờ hẹn *</label>
                  <select
                    className={styles.select}
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
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
                <label className={styles.label}>Gợi ý dịch vụ trị liệu</label>
                <select
                  className={styles.select}
                  value={bookServiceId}
                  onChange={(e) => setBookServiceId(e.target.value)}
                >
                  <option value="">-- Chọn dịch vụ mong muốn (Tùy chọn) --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.price.toLocaleString("vi-VN")}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Ghi chú thêm</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Ví dụ: Khách hẹn làm cùng bạn bè, yêu cầu phòng VIP..."
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className={styles.cancelModalBtn}
                  disabled={loading}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className={styles.submitModalBtn}
                  disabled={loading}
                  style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                >
                  {loading && <Loader2 size={14} className={styles.spin} />}
                  Đặt lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT APPOINTMENT */}
      {showEditModal && editingAppt && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Sửa thông tin lịch hẹn</h3>
              <button onClick={() => { setShowEditModal(false); setEditingAppt(null); }} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Khách hàng</label>
                <input
                  type="text"
                  className={styles.input}
                  value={`${editingAppt.customer.fullName} (${editingAppt.customer.phone})`}
                  disabled
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày hẹn *</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giờ hẹn *</label>
                  <select
                    className={styles.select}
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
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
                <label className={styles.label}>Ghi chú chi tiết</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Ghi chú dịch vụ trị liệu hoặc yêu cầu..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingAppt(null); }}
                  className={styles.cancelModalBtn}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitModalBtn}
                  disabled={loading}
                  style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                >
                  {loading && <Loader2 size={14} className={styles.spin} />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 3: INLINE CREATE INVOICE MODAL */}
      {showInvoiceModal && activeAppointment && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "900px", width: "90vw" }}>
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
                onSuccess={() => {
                  setShowInvoiceModal(false);
                  setActiveAppointment(null);
                  setSuccessMsg("Lập hóa đơn thanh toán thành công!");
                  // Cập nhật trạng thái lịch hẹn cục bộ thành completed
                  setAppointments(prev =>
                    prev.map(a => a.id === activeAppointment.id ? { ...a, status: "completed" } : a)
                  );
                  router.refresh();
                }}
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
