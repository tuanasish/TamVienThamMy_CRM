"use client";

import { useState } from "react";
import styles from "@/app/staff/sales/page.module.css";
import { Activity, X, Loader2 } from "lucide-react";

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

interface SalesRecordUsageModalProps {
  customerId: string;
  customerName: string;
  services: { id: string; name: string; price: number; type: string }[];
  staffMembers: { id: string; fullName: string }[];
  onSuccess: () => void;
}

const formatMoneyInput = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseMoneyInput = (val: string) => {
  return val.replace(/\./g, "");
};

export default function SalesRecordUsageModal({
  customerId,
  customerName,
  services,
  staffMembers,
  onSuccess,
}: SalesRecordUsageModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Dynamic customer card and treatment packages
  const [cards, setCards] = useState<CustomerCardWithTemplate[]>([]);
  const [treatments, setTreatments] = useState<CustomerTreatmentWithService[]>([]);

  // Form states
  const [sourceType, setSourceType] = useState<"card" | "treatment">("treatment");
  const [sourceId, setSourceId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [amountDeducted, setAmountDeducted] = useState("");
  const [sessionsDeducted, setSessionsDeducted] = useState("1");
  const [performedBy, setPerformedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [staffId, setStaffId] = useState("");

  const [error, setError] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const handleOpen = async () => {
    setIsOpen(true);
    setLoadingData(true);
    setError("");
    setCards([]);
    setTreatments([]);

    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể tải số dư thẻ và liệu trình");
      }

      const fetchedCards = data.cards || [];
      const fetchedTreatments = data.treatments || [];

      setCards(fetchedCards);
      setTreatments(fetchedTreatments);

      // Set default selections
      if (fetchedTreatments.length > 0) {
        setSourceType("treatment");
        setSourceId(fetchedTreatments[0].id);
      } else if (fetchedCards.length > 0) {
        setSourceType("card");
        setSourceId(fetchedCards[0].id);
      } else {
        setSourceType("treatment");
        setSourceId("");
      }

      if (staffMembers.length > 0) {
        setStaffId(staffMembers[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối khi tải dữ liệu khách hàng");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSourceTypeChange = (type: "card" | "treatment") => {
    setSourceType(type);
    setSourceId("");
    setServiceId("");
    setAmountDeducted("");

    if (type === "treatment" && treatments.length > 0) {
      setSourceId(treatments[0].id);
    } else if (type === "card" && cards.length > 0) {
      setSourceId(cards[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoadingSubmit(true);

    if (!sourceId) {
      setError("Khách hàng không sở hữu thẻ nạp hoặc gói liệu trình phù hợp");
      setLoadingSubmit(false);
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
      setLoadingSubmit(false);
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

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`${styles.actionBtnSmall} ${styles.btnEdit}`}
        title="Ghi nhận khách sử dụng dịch vụ"
      >
        <Activity size={14} /> Dùng dịch vụ
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "500px" }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--text-primary)" }}>
                Ghi nhận sử dụng cho: {customerName}
              </h3>
              <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            {loadingData ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", gap: "1rem", color: "var(--text-secondary)" }}>
                <Loader2 className="animate-spin" size={28} style={{ color: "var(--accent-gold)" }} />
                <span>Đang tải thông tin thẻ nạp & liệu trình...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                {error && (
                  <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "0.75rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                    {error}
                  </div>
                )}

                {cards.length === 0 && treatments.length === 0 ? (
                  <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--accent-gold)", fontWeight: 600, background: "rgba(197, 160, 89, 0.05)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                    ⚠️ Khách hàng này hiện chưa mua thẻ tài khoản hoặc gói liệu trình nào để sử dụng.
                  </div>
                ) : (
                  <>
                    {/* Source type selection */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Hình thức sử dụng</label>
                      <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.25rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="salesSourceType"
                            checked={sourceType === "treatment"}
                            onChange={() => handleSourceTypeChange("treatment")}
                            disabled={loadingSubmit}
                          />
                          Trừ buổi liệu trình
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="salesSourceType"
                            checked={sourceType === "card"}
                            onChange={() => handleSourceTypeChange("card")}
                            disabled={loadingSubmit}
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
                          className={styles.select}
                          value={sourceId}
                          onChange={(e) => setSourceId(e.target.value)}
                          required
                          disabled={loadingSubmit}
                        >
                          <option value="">-- Chọn liệu trình của khách --</option>
                          {treatments.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.service.name} (Còn {t.totalSessions - t.usedSessions}/{t.totalSessions} buổi)
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Chọn Thẻ Tài Khoản *</label>
                        <select
                          className={styles.select}
                          value={sourceId}
                          onChange={(e) => setSourceId(e.target.value)}
                          required
                          disabled={loadingSubmit}
                        >
                          <option value="">-- Chọn thẻ tài khoản --</option>
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
                            className={styles.select}
                            value={serviceId}
                            onChange={(e) => setServiceId(e.target.value)}
                            required
                            disabled={loadingSubmit}
                          >
                            <option value="">-- Chọn dịch vụ thực hiện --</option>
                            {services.filter(s => s.type === "service").map((s) => (
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
                            className={styles.input}
                            placeholder="Ví dụ: 500.000"
                            value={amountDeducted}
                            onChange={(e) => setAmountDeducted(formatMoneyInput(e.target.value))}
                            required
                            disabled={loadingSubmit}
                          />
                        </div>
                      </>
                    )}

                    {sourceType === "treatment" && (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Số buổi thực hiện trừ *</label>
                        <input
                          type="number"
                          className={styles.input}
                          value={sessionsDeducted}
                          onChange={(e) => setSessionsDeducted(e.target.value)}
                          required
                          disabled={loadingSubmit}
                          min="1"
                        />
                      </div>
                    )}

                    {/* Operations detail */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Kỹ thuật viên *</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Tên KTV làm"
                          value={performedBy}
                          onChange={(e) => setPerformedBy(e.target.value)}
                          required
                          disabled={loadingSubmit}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Người ghi nhận *</label>
                        <select
                          className={styles.select}
                          value={staffId}
                          onChange={(e) => setStaffId(e.target.value)}
                          required
                          disabled={loadingSubmit}
                        >
                          <option value="">-- Chọn nhân viên --</option>
                          {staffMembers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Ghi chú buổi làm</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ví dụ: Da cải thiện, đi máy laser bước sóng 532..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={loadingSubmit}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className={`${styles.actionBtnSmall} ${styles.btnGhost}`}
                        disabled={loadingSubmit}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className={`${styles.actionBtnSmall} ${styles.btnPrimary}`}
                        disabled={loadingSubmit}
                      >
                        {loadingSubmit ? "Đang xử lý..." : "Xác nhận trừ thẻ/buổi"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
