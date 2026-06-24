"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/customers/page.module.css";
import { Edit3, X } from "lucide-react";

interface CustomerProp {
  id: string;
  fullName: string;
  phone: string;
  dob?: string | null;
  gender?: string | null;
  cccd?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: string | null;
}

interface EditCustomerModalProps {
  customer: CustomerProp;
}

export default function EditCustomerModal({ customer }: EditCustomerModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const [fullName, setFullName] = useState(customer.fullName);
  const [phone, setPhone] = useState(customer.phone);
  const [dob, setDob] = useState(
    customer.dob ? new Date(customer.dob).toISOString().split("T")[0] : ""
  );
  const [gender, setGender] = useState(customer.gender || "Nữ");
  const [status, setStatus] = useState(customer.status || "active");
  const [cccd, setCccd] = useState(customer.cccd || "");
  const [address, setAddress] = useState(customer.address || "");
  const [notes, setNotes] = useState(customer.notes || "");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phone,
          dob: dob || null,
          gender,
          status,
          cccd: cccd || null,
          address: address || null,
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể cập nhật hồ sơ khách hàng");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className={styles.searchBtn} 
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
      >
        <Edit3 size={16} />
        <span>Sửa thông tin</span>
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Chỉnh sửa thông tin khách hàng</h3>
              <X className={styles.modalClose} onClick={() => setIsOpen(false)} size={20} />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "600" }}>{error}</div>}
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Họ và Tên *</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Số điện thoại *</label>
                  <input
                    type="tel"
                    className={styles.searchInput}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Ngày sinh</label>
                  <input
                    type="date"
                    className={styles.searchInput}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Giới tính</label>
                  <select
                    className={styles.searchInput}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={loading}
                    style={{ appearance: "auto" }}
                  >
                    <option value="Nữ">Nữ</option>
                    <option value="Nam">Nam</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Trạng thái khách hàng</label>
                  <select
                    className={styles.searchInput}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={loading}
                    style={{ appearance: "auto" }}
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="lost">Không còn nhu cầu</option>
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.label}>Số CCCD</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.label}>Địa chỉ</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.label}>Ghi chú bệnh lý/Da liễu</label>
                  <textarea
                    className={styles.searchInput}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    style={{ minHeight: "80px", fontFamily: "inherit" }}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setIsOpen(false)} className={styles.cancelBtn} disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className={styles.createBtn} disabled={loading}>
                  {loading ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
