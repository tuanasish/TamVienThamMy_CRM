"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/users/page.module.css";
import { UserPlus, X } from "lucide-react";

export default function AddStaffModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [target, setTarget] = useState("");
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

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          username,
          password,
          role,
          permissions: role === "admin" ? [] : permissions,
          target: target ? Number(target.replace(/\./g, "")) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể thêm nhân viên mới");
      }

      // Reset form and close
      setFullName("");
      setUsername("");
      setPassword("");
      setRole("staff");
      setPermissions([]);
      setTarget("");
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
        <span>Thêm nhân viên</span>
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Tạo tài khoản nhân viên mới</h3>
              <X className={styles.modalClose} onClick={() => setIsOpen(false)} size={20} />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "600", marginBottom: "1.25rem" }}>{error}</div>}
              
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formFull}`} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label}>Họ và Tên *</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Ví dụ: Lễ tân Vy"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label}>Tên tài khoản (username) *</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Ví dụ: vy.staff"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
                  <label className={styles.label}>Mật khẩu đăng nhập *</label>
                  <input
                    type="password"
                    className={styles.searchInput}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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

                <div className={styles.formGroup} style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", width: "100%" }}>
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

              <div className={styles.formActions}>
                <button type="button" onClick={() => setIsOpen(false)} className={styles.cancelBtn} disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className={styles.createBtn} disabled={loading}>
                  {loading ? "Đang lưu..." : "Lưu tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
