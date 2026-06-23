"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/customers/page.module.css";
import { UserPlus, X } from "lucide-react";

export default function AddCustomerModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Nữ");
  const [cccd, setCccd] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phone,
          dob: dob || undefined,
          gender,
          cccd: cccd || undefined,
          address: address || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể thêm khách hàng mới");
      }

      // Reset form and close
      setFullName("");
      setPhone("");
      setDob("");
      setCccd("");
      setAddress("");
      setNotes("");
      setIsOpen(false);
      
      // Refresh page data
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={styles.searchBtn} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <UserPlus size={18} />
        <span>Thêm khách hàng</span>
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Thêm hồ sơ khách hàng mới</h3>
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
                    placeholder="Nguyễn Vy"
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
                    placeholder="0912345678"
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

                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.label}>Số CCCD</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Nhập 12 số CCCD"
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
                    placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.label}>Ghi chú bệnh lý/Da liễu</label>
                  <textarea
                    className={styles.searchInput}
                    placeholder="Da nhạy cảm, có tiền sử dị ứng..."
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
                  {loading ? "Đang lưu..." : "Lưu hồ sơ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
