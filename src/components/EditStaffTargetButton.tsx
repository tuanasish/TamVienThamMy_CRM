"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/users/page.module.css";
import { Edit2, X, Loader2, TrendingUp } from "lucide-react";

interface EditStaffTargetButtonProps {
  staffId: string;
  staffName: string;
  initialTarget: number | null;
}

const formatMoneyInput = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function EditStaffTargetButton({
  staffId,
  staffName,
  initialTarget,
}: EditStaffTargetButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState(() =>
    initialTarget !== null ? formatMoneyInput(initialTarget.toString()) : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: staffId,
          target: target ? Number(target.replace(/\./g, "")) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật chỉ tiêu");

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayTarget = initialTarget !== null 
    ? `${initialTarget.toLocaleString("vi-VN")}đ` 
    : "Chưa đặt (Mặc định 30M)";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{displayTarget}</span>
        <button
          onClick={() => setIsOpen(true)}
          style={{ background: "transparent", border: "none", color: "var(--accent-gold)", cursor: "pointer", display: "inline-flex", padding: "0.25rem" }}
          title="Sửa chỉ tiêu doanh số"
        >
          <Edit2 size={14} />
        </button>
      </div>

      {isOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modal} style={{ maxWidth: "400px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <TrendingUp size={18} style={{ color: "var(--accent-gold)" }} />
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Đặt chỉ tiêu: {staffName}</span>
              </h3>
              <X className={styles.modalClose} onClick={() => setIsOpen(false)} size={20} />
            </div>

            <form onSubmit={handleSubmit} className={styles.form} style={{ marginTop: "1rem" }}>
              {error && (
                <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "600", marginBottom: "1rem" }}>
                  {error}
                </div>
              )}

              <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
                <label className={styles.label}>Chỉ tiêu doanh số tháng (đ)</label>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Ví dụ: 30.000.000 (Để trống = Mặc định 30M)"
                  value={target}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setTarget(clean ? clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "");
                  }}
                  disabled={loading}
                  autoFocus
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.4rem", lineHeight: "1.4" }}>
                  Chỉ tiêu này sẽ được hiển thị trên bảng xếp hạng KPI và tiến trình đạt Target của nhân viên.
                </span>
              </div>

              <div className={styles.formActions} style={{ margin: 0 }}>
                <button type="button" onClick={() => setIsOpen(false)} className={styles.cancelBtn} disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className={styles.createBtn} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  <span>Cập nhật</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
