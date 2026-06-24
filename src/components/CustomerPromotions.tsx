"use client";

import { useState } from "react";
import { Sparkles, X, Check, Loader2 } from "lucide-react";
import styles from "@/app/customer/page.module.css";

interface Promotion {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  isActive: boolean;
  createdAt: Date | string;
}

interface CustomerPromotionsProps {
  promotions: Promotion[];
  customerName: string;
  customerPhone: string;
}

export default function CustomerPromotions({
  promotions,
  customerName,
  customerPhone,
}: CustomerPromotionsProps) {
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [phone, setPhone] = useState(customerPhone);
  const [name, setName] = useState(customerName);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleOpenRegisterModal = (promo: Promotion) => {
    setSelectedPromo(promo);
    setPhone(customerPhone);
    setName(customerName);
    setNotes("");
    setError("");
    setSuccess(false);
  };

  const handleRegisterPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromo) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/promotions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotionId: selectedPromo.id,
          customerPhone: phone,
          customerName: name,
          notes,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng ký thất bại");

      setSuccess(true);
      setTimeout(() => {
        setSelectedPromo(null);
        setSuccess(false);
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Lỗi hệ thống khi đăng ký nhận ưu đãi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.promotionsSection}>
      <h3 className={styles.sectionTitle}>
        <Sparkles size={18} style={{ marginRight: "0.5rem", verticalAlign: "middle", color: "var(--accent-gold)" }} />
        Khuyến mãi &amp; Ưu đãi dành riêng cho bạn
      </h3>

      {promotions.length === 0 ? (
        <div className={styles.emptyPromoText}>
          Hiện chưa có ưu đãi mới dành riêng cho bạn. Hãy quay lại sau nhé!
        </div>
      ) : (
        <div className={styles.promotionsGrid}>
          {promotions.map((promo) => (
            <div key={promo.id} className={styles.promoCardItem}>
              <div className={styles.promoCardBadge}>ƯU ĐÃI ĐẶC BIỆT</div>
              <h4 className={styles.promoCardTitle}>{promo.title}</h4>
              <p className={styles.promoCardDesc}>{promo.description}</p>
              <button
                onClick={() => handleOpenRegisterModal(promo)}
                className={styles.promoRegisterBtn}
              >
                Đăng ký nhận ngay
              </button>
            </div>
          ))}
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {selectedPromo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-primary)" }}>Đăng ký giữ suất ưu đãi</h3>
              <button onClick={() => setSelectedPromo(null)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div className={styles.successState}>
                <div className={styles.successIconWrapper}>
                  <Check size={24} />
                </div>
                <h4 style={{ fontWeight: 700, margin: "1rem 0 0.5rem 0", color: "#28a745" }}>Đăng ký thành công!</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Chuyên viên tư vấn của Spa sẽ liên hệ với bạn qua SĐT <strong>{phone}</strong> trong thời gian sớm nhất để xác nhận giữ ưu đãi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterPromo} className={styles.modalForm}>
                <div className={styles.promoTargetBlock}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Ưu đãi bạn chọn:</div>
                  <div style={{ fontWeight: 800, color: "var(--accent-gold)", marginTop: "0.15rem", fontSize: "0.95rem" }}>{selectedPromo.title}</div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.formGroup}>
                  <label className={styles.label}>Họ và tên khách hàng *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Số điện thoại nhận ưu đãi *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.input}
                    required
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Ghi chú thêm (Giờ muốn gọi điện, yêu cầu riêng...)</label>
                  <textarea
                    placeholder="Ví dụ: Vui lòng gọi điện tư vấn cho mình vào buổi tối..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={styles.textarea}
                    rows={3}
                    disabled={loading}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setSelectedPromo(null)}
                    className={styles.cancelBtn}
                    disabled={loading}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className={styles.spinner} />
                        <span>Đang đăng ký...</span>
                      </>
                    ) : (
                      "Xác nhận đăng ký"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
