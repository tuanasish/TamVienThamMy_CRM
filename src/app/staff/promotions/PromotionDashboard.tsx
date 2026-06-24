"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Plus, Trash2, Check, X, Phone, Tag, Calendar, User, FileText, AlertCircle, Sparkles } from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Registration {
  id: string;
  promotionId: string;
  promotionTitle: string;
  customerPhone: string;
  customerName: string;
  notes?: string | null;
  status: string;
  createdAt: string;
}

interface PromotionDashboardProps {
  initialPromotions: Promotion[];
  initialRegistrations: Registration[];
}

export default function PromotionDashboard({
  initialPromotions,
  initialRegistrations,
}: PromotionDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"promos" | "leads">("leads"); // Default to leads to see signups
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  
  // Create promotion form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError("Vui lòng điền đầy đủ tiêu đề và mô tả");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, image: image || null, isActive }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo ưu đãi");

      setSuccess("Tạo chương trình khuyến mãi mới thành công!");
      setPromotions([data, ...promotions]);
      
      // Reset form
      setTitle("");
      setDescription("");
      setImage("");
      setIsActive(true);
      setShowAddModal(false);
      
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa chương trình ưu đãi này? Khách hàng sẽ không còn nhìn thấy chương trình này nữa.")) return;
    
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/promotions/${promoId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa ưu đãi");

      setSuccess("Đã xóa chương trình ưu đãi.");
      setPromotions(promotions.filter((p) => p.id !== promoId));
      
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTogglePromoStatus = async (promoId: string, currentStatus: boolean) => {
    setError("");
    try {
      const response = await fetch(`/api/promotions/${promoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật ưu đãi");

      setPromotions(promotions.map((p) => (p.id === promoId ? data : p)));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateRegistrationStatus = async (regId: string, newStatus: string) => {
    setError("");
    try {
      const response = await fetch(`/api/promotions/registrations/${regId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật trạng thái");

      setRegistrations(registrations.map((r) => (r.id === regId ? { ...r, status: newStatus } : r)));
      setSuccess("Cập nhật trạng thái liên hệ thành công!");
      router.refresh();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRegistration = async (regId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hồ sơ đăng ký tư vấn này?")) return;

    setError("");
    try {
      const response = await fetch(`/api/promotions/registrations/${regId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa hồ sơ");

      setRegistrations(registrations.filter((r) => r.id !== regId));
      setSuccess("Đã xóa hồ sơ đăng ký tư vấn.");
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Tab Selectors */}
      <div className={styles.tabContainer}>
        <button
          onClick={() => { setActiveTab("leads"); setError(""); }}
          className={`${styles.tabBtn} ${activeTab === "leads" ? styles.tabActive : ""}`}
        >
          <Phone size={16} style={{ marginRight: "0.4rem" }} />
          Danh sách liên hệ giữ ưu đãi ({registrations.length})
        </button>
        <button
          onClick={() => { setActiveTab("promos"); setError(""); }}
          className={`${styles.tabBtn} ${activeTab === "promos" ? styles.tabActive : ""}`}
        >
          <Tag size={16} style={{ marginRight: "0.4rem" }} />
          Chương trình ưu đãi đang chạy ({promotions.length})
        </button>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      {/* TABS CONTENT 1: LEADS LIST */}
      {activeTab === "leads" && (
        <div className={styles.sectionCard} style={{ marginTop: "1rem" }}>
          <h3 className={styles.sectionTitle}>Khách hàng đăng ký giữ suất ưu đãi</h3>

          <div className={styles.tableWrapper}>
            {registrations.length === 0 ? (
              <div className={styles.emptyState}>
                <AlertCircle size={40} className={styles.emptyIcon} />
                <p className={styles.emptyText}>Chưa có lượt đăng ký nhận ưu đãi nào từ Khách hàng.</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Ưu đãi đăng ký</th>
                    <th>Lời nhắn từ khách</th>
                    <th>Thời gian</th>
                    <th>Trạng thái xử lý</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id} className={styles.tr}>
                      <td>
                        <div className={styles.customerBlock}>
                          <div className={styles.userIcon}><User size={14} /></div>
                          <div>
                            <div className={styles.custName}>{reg.customerName}</div>
                            <div className={styles.custPhone}>{reg.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.promoTag}>✨ {reg.promotionTitle}</span>
                      </td>
                      <td>
                        <div className={styles.notesText}>
                          {reg.notes ? `"${reg.notes}"` : <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Không có ghi chú</span>}
                        </div>
                      </td>
                      <td>
                        <div className={styles.dateTimeText}>
                          <Calendar size={12} style={{ marginRight: "0.25rem", verticalAlign: "middle" }} />
                          {formatDateTime(reg.createdAt)}
                        </div>
                      </td>
                      <td>
                        <select
                          value={reg.status}
                          onChange={(e) => handleUpdateRegistrationStatus(reg.id, e.target.value)}
                          className={`${styles.statusSelect} ${
                            reg.status === "pending" ? styles.statusPending :
                            reg.status === "contacted" ? styles.statusContacted :
                            styles.statusCancelled
                          }`}
                        >
                          <option value="pending">🟡 Chờ liên hệ</option>
                          <option value="contacted">🟢 Đã liên hệ</option>
                          <option value="cancelled">🔴 Đã hủy bỏ</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => handleDeleteRegistration(reg.id)}
                          className={styles.deleteBtnSmall}
                          title="Xóa hồ sơ này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TABS CONTENT 2: PROMOTIONS LIST */}
      {activeTab === "promos" && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Quản lý chương trình khuyến mãi</h3>
            <button onClick={() => setShowAddModal(true)} className={styles.addBtn}>
              <Plus size={16} style={{ marginRight: "0.25rem" }} />
              Tạo ưu đãi mới
            </button>
          </div>

          {promotions.length === 0 ? (
            <div className={styles.sectionCard}>
              <div className={styles.emptyState}>
                <AlertCircle size={40} className={styles.emptyIcon} />
                <p className={styles.emptyText}>Chưa có chương trình ưu đãi nào được tạo. Hãy tạo mới ngay để hiển thị trên cổng Khách hàng!</p>
              </div>
            </div>
          ) : (
            <div className={styles.promoGrid}>
              {promotions.map((promo) => (
                <div key={promo.id} className={`${styles.promoCard} ${!promo.isActive ? styles.promoCardInactive : ""}`}>
                  <div className={styles.promoCardHeader}>
                    <h4 className={styles.promoTitle}>{promo.title}</h4>
                    <span className={`${styles.badge} ${promo.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                      {promo.isActive ? "Đang chạy" : "Tạm ngưng"}
                    </span>
                  </div>
                  <p className={styles.promoDesc}>{promo.description}</p>
                  {promo.image && (
                    <div style={{ fontSize: "0.75rem", color: "var(--accent-gold)", fontStyle: "italic", marginBottom: "0.5rem" }}>
                      Link ảnh: {promo.image}
                    </div>
                  )}
                  <div className={styles.promoCardActions}>
                    <button
                      onClick={() => handleTogglePromoStatus(promo.id, promo.isActive)}
                      className={`${styles.actionBtnSmall} ${promo.isActive ? styles.btnWarning : styles.btnSuccess}`}
                    >
                      {promo.isActive ? "Tạm tắt" : "Bật lại"}
                    </button>
                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      className={`${styles.actionBtnSmall} ${styles.btnDanger}`}
                    >
                      <Trash2 size={14} style={{ marginRight: "0.25rem" }} /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE PROMOTION MODAL */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--text-primary)" }}>Thêm chương trình ưu đãi mới</h3>
              <button onClick={() => setShowAddModal(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tiêu đề khuyến mãi *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ví dụ: Giảm 50% liệu trình trị mụn công nghệ cao"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Nội dung ưu đãi / Cách thức giữ chỗ *</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Mô tả chi tiết chương trình khuyến mãi và hướng dẫn khách bấm Đăng ký ngay để chuyên viên gọi điện hỗ trợ giữ suất..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Đường dẫn hình ảnh ưu đãi (Không bắt buộc)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="https://example.com/promo-image.jpg"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup} style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={loading}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="isActive" style={{ fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>Kích hoạt hiển thị cho Khách hàng ngay lập tức</label>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.cancelBtn} disabled={loading}>
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? "Đang xử lý..." : "Tạo ưu đãi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
