"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/customers/page.module.css";
import { Activity, X } from "lucide-react";

const formatMoneyInput = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseMoneyInput = (val: string) => {
  return val.replace(/\./g, "");
};

interface CustomerCardWithTemplate {
  id: string;
  currentBalance: any;
  template: { name: string };
}

interface CustomerTreatmentWithService {
  id: string;
  usedSessions: number;
  totalSessions: number;
  service: { id: string; name: string };
}

interface RecordUsageModalProps {
  customerId: string;
  cards: CustomerCardWithTemplate[];
  treatments: CustomerTreatmentWithService[];
  services: { id: string; name: string; price: number }[];
  staffMembers: { id: string; fullName: string }[];
}

export default function RecordUsageModal({
  customerId,
  cards,
  treatments,
  services,
  staffMembers,
}: RecordUsageModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"card" | "treatment">("treatment");
  const [sourceId, setSourceId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [amountDeducted, setAmountDeducted] = useState("");
  const [sessionsDeducted, setSessionsDeducted] = useState("1");
  const [performedBy, setPerformedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // When changing sourceType, reset sourceId and dependent fields
  const handleSourceTypeChange = (type: "card" | "treatment") => {
    setSourceType(type);
    setSourceId("");
    setServiceId("");
    setAmountDeducted("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!sourceId) {
      setError("Vui lòng chọn thẻ nạp hoặc gói liệu trình cụ thể");
      setLoading(false);
      return;
    }

    let finalServiceId = serviceId;
    if (sourceType === "treatment") {
      const selectedTreatment = treatments.find((t) => t.id === sourceId);
      if (selectedTreatment) {
        finalServiceId = selectedTreatment.service.id;
      }
    }

    if (!finalServiceId) {
      setError("Vui lòng chọn dịch vụ thực hiện");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          serviceId: finalServiceId,
          sourceType,
          sourceId,
          amountDeducted: sourceType === "card" ? Number(parseMoneyInput(amountDeducted)) : 0,
          sessionsDeducted: sourceType === "treatment" ? Number(sessionsDeducted) : 0,
          performedBy,
          notes: notes || undefined,
          staffId: staffId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ghi nhận sử dụng thất bại");
      }

      setIsOpen(false);
      setSourceId("");
      setServiceId("");
      setAmountDeducted("");
      setSessionsDeducted("1");
      setPerformedBy("");
      setNotes("");
      setStaffId("");

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
        onClick={() => {
          setIsOpen(true);
          // Set initial default options if available
          if (treatments.length > 0) {
            setSourceType("treatment");
            setSourceId(treatments[0].id);
          } else if (cards.length > 0) {
            setSourceType("card");
            setSourceId(cards[0].id);
          }
          if (staffMembers.length > 0) {
            setStaffId(staffMembers[0].id);
          }
        }} 
        className={styles.createBtn} 
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", justifyContent: "center", padding: "0.85rem" }}
      >
        <Activity size={18} />
        <span>Ghi nhận sử dụng</span>
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Ghi nhận sử dụng dịch vụ</h3>
              <X className={styles.modalClose} onClick={() => setIsOpen(false)} size={20} />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "600" }}>{error}</div>}

              {/* Source type selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Hình thức sử dụng</label>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: "0.95rem" }}>
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === "treatment"}
                      onChange={() => handleSourceTypeChange("treatment")}
                      disabled={loading}
                    />
                    Trừ buổi liệu trình
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: "0.95rem" }}>
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === "card"}
                      onChange={() => handleSourceTypeChange("card")}
                      disabled={loading}
                    />
                    Trừ tiền thẻ nạp
                  </label>
                </div>
              </div>

              {/* Source selections */}
              {sourceType === "treatment" ? (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Chọn Gói Liệu Trình *</label>
                  <select
                    className={styles.searchInput}
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    required
                    disabled={loading}
                    style={{ appearance: "auto" }}
                  >
                    <option value="">-- Chọn liệu trình --</option>
                    {treatments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.service.name} (Còn lại {t.totalSessions - t.usedSessions}/{t.totalSessions} buổi)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Chọn Thẻ Tài Khoản *</label>
                  <select
                    className={styles.searchInput}
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    required
                    disabled={loading}
                    style={{ appearance: "auto" }}
                  >
                    <option value="">-- Chọn thẻ nạp --</option>
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.template.name} (Số dư: {Number(c.currentBalance).toLocaleString("vi-VN")}đ)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic details input */}
              {sourceType === "card" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Chọn Dịch Vụ Thực Hiện *</label>
                    <select
                      className={styles.searchInput}
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      required
                      disabled={loading}
                      style={{ appearance: "auto" }}
                    >
                      <option value="">-- Chọn dịch vụ --</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({Number(s.price).toLocaleString("vi-VN")}đ)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Số tiền trừ từ thẻ *</label>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Ví dụ: 1.500.000"
                      value={amountDeducted}
                      onChange={(e) => setAmountDeducted(formatMoneyInput(e.target.value))}
                      required
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {sourceType === "treatment" && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số buổi thực hiện trừ *</label>
                  <input
                    type="number"
                    className={styles.searchInput}
                    value={sessionsDeducted}
                    onChange={(e) => setSessionsDeducted(e.target.value)}
                    required
                    disabled={loading}
                    min="1"
                  />
                </div>
              )}

              {/* Operations detail */}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Kỹ thuật viên thực hiện *</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Tên kỹ thuật viên làm"
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nhân viên ghi nhận *</label>
                  <select
                    className={styles.searchInput}
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    required
                    disabled={loading}
                    style={{ appearance: "auto" }}
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {staffMembers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.label}>Ghi chú buổi làm (Ví dụ: thông số máy, tình trạng da...)</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Khách làm bước 2 liệu trình, da giảm đỏ..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setIsOpen(false)} className={styles.cancelBtn} disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className={styles.createBtn} disabled={loading}>
                  {loading ? "Đang xử lý..." : "Xác nhận sử dụng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
