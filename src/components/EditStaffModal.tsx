"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/users/page.module.css";
import { Edit2, X } from "lucide-react";

interface EditStaffModalProps {
  staffId: string;
  initialFullName: string;
  initialUsername: string;
  initialRole: string;
  initialPermissions?: string[];
  initialTarget: number | null;
}

export default function EditStaffModal({
  staffId,
  initialFullName,
  initialUsername,
  initialRole,
  initialPermissions = [],
  initialTarget,
}: EditStaffModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [role, setRole] = useState(initialRole);
  const [permissions, setPermissions] = useState<string[]>(initialPermissions);
  const [target, setTarget] = useState(initialTarget ? initialTarget.toLocaleString("vi-VN") : "");
  const [password, setPassword] = useState(""); // Optional password reset
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const AVAILABLE_PERMISSIONS = [
    { id: "customers:view", name: "Xem khách hàng" },
    { id: "customers:edit", name: "Chỉnh sửa khách & quẹt liệu trình" },
    { id: "sales:create", name: "Lên hóa đơn bán hàng" },
    { id: "debts:manage", name: "Quản lý công nợ/trả góp" },
    { id: "services:manage", name: "Cấu hình dịch vụ/thẻ nạp" },
    { id: "promotions:manage", name: "Quản lý chương trình ưu đãi" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload: any = {
      id: staffId,
      fullName,
      role,
      permissions: role === "admin" ? [] : permissions,
      target: target ? Number(target.replace(/\./g, "")) : null,
    };

    if (password.trim() !== "") {
      payload.password = password;
    }

    try {
      const response = await fetch("/api/staff", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể cập nhật thông tin nhân viên");
      }

      setPassword("");
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
      <button 
        onClick={() => setIsOpen(true)} 
        className={styles.targetBtn} 
        style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "0.25rem", 
          padding: "0.4rem 0.75rem", 
          fontSize: "0.82rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          color: "var(--accent-gold)",
          borderRadius: "var(--radius-sm)",
          fontWeight: 600,
          marginRight: "0.5rem"
        }}
      >
        <Edit2 size={12} />
        <span>Sửa</span>
      </button>

      {isOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Chỉnh sửa tài khoản nhân viên</h3>
              <X className={styles.modalClose} onClick={() => setIsOpen(false)} size={20} />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "600", marginBottom: "1.25rem" }}>{error}</div>}
              
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formFull}`} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label}>Tên tài khoản (username) - Chỉ đọc</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    value={initialUsername}
                    disabled
                    style={{ background: "rgba(0,0,0,0.05)", cursor: "not-allowed" }}
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formFull}`} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label}>Họ và Tên *</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Họ tên nhân viên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label}>Mật khẩu mới (Để trống nếu giữ nguyên)</label>
                  <input
                    type="password"
                    className={styles.searchInput}
                    placeholder="Đổi mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label}>Vai trò *</label>
                  <select
                    className={styles.searchInput}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    style={{ appearance: "auto" }}
                  >
                    <option value="staff">Nhân viên (staff)</option>
                    <option value="admin">Quản trị viên (admin)</option>
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.formFull}`} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label}>Chỉ tiêu doanh số tháng (đ)</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Ví dụ: 30.000.000"
                    value={target}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "");
                      setTarget(clean ? clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "");
                    }}
                    disabled={loading}
                  />
                </div>
              </div>

              {role === "staff" && (
                <div className={`${styles.formGroup} ${styles.formFull}`} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label} style={{ marginBottom: "0.5rem", display: "block", fontWeight: "bold" }}>
                    Quyền hạn chức năng *
                  </label>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", 
                    gap: "0.75rem", 
                    padding: "0.75rem", 
                    background: "rgba(223, 183, 108, 0.05)", 
                    borderRadius: "8px", 
                    border: "1px solid var(--border-color)" 
                  }}>
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={permissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPermissions([...permissions, perm.id]);
                            } else {
                              setPermissions(permissions.filter((p) => p !== perm.id));
                            }
                          }}
                          disabled={loading}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ color: "var(--text-primary)" }}>{perm.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.formActions} style={{ marginTop: "1.5rem" }}>
                <button type="button" onClick={() => setIsOpen(false)} className={styles.cancelBtn} disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className={styles.createBtn} disabled={loading}>
                  {loading ? "Đang lưu..." : "Cập nhật tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
