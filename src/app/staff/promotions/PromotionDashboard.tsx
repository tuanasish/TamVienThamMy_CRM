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
  userRole: string;
}

// BỘ PHÂN TÍCH ĐỊNH DẠNG BẢNG GIÁ DỰA TRÊN DÒNG
interface PricingRow {
  name: string;
  price: string;
}

function parsePricingDescription(description: string): PricingRow[] | null {
  if (!description) return null;
  const lines = description.split("\n").map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  
  const rows: PricingRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) separatorIndex = line.indexOf("|");
    if (separatorIndex === -1) separatorIndex = line.indexOf(" - ");
    
    if (separatorIndex === -1) return null;
    
    const name = line.substring(0, separatorIndex).trim();
    const offset = line.startsWith(" - ", separatorIndex) ? 3 : 1;
    const price = line.substring(separatorIndex + offset).trim();
    
    if (!name || !price) return null;
    
    rows.push({ name, price });
  }
  return rows.length > 0 ? rows : null;
}

export default function PromotionDashboard({
  initialPromotions,
  initialRegistrations,
  userRole,
}: PromotionDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"promos" | "leads">("leads"); // Default to leads to see signups
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // STATE CHO FORM THÊM MỚI (CREATE PROMO)
  // ==========================================
  const [showAddModal, setShowAddModal] = useState(false);
  const [promoType, setPromoType] = useState<"banner" | "pricing" | "feedback">("banner");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  // Các trường cấu trúc cho Bảng giá và Feedback
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([{ name: "", price: "" }]);
  const [feedbackImgBefore, setFeedbackImgBefore] = useState("");
  const [feedbackImgProgress, setFeedbackImgProgress] = useState("");
  const [feedbackImgAfter, setFeedbackImgAfter] = useState("");

  // ==========================================
  // STATE CHO FORM CHỈNH SỬA (EDIT PROMO)
  // ==========================================
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [editPromoType, setEditPromoType] = useState<"banner" | "pricing" | "feedback">("banner");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  
  // Các trường cấu trúc chỉnh sửa cho Bảng giá và Feedback
  const [editPricingRows, setEditPricingRows] = useState<PricingRow[]>([{ name: "", price: "" }]);
  const [editFeedbackImgBefore, setEditFeedbackImgBefore] = useState("");
  const [editFeedbackImgProgress, setEditFeedbackImgProgress] = useState("");
  const [editFeedbackImgAfter, setEditFeedbackImgAfter] = useState("");

  // ==========================================
  // XỬ LÝ SỰ KIỆN MỞ POPUP SỬA (DESERIALIZE)
  // ==========================================
  const handleOpenEditModal = (promo: Promotion) => {
    setEditingPromo(promo);
    setEditTitle(promo.title);
    setEditIsActive(promo.isActive);
    setError("");

    // Phân loại và tự động chuyển đổi sang giao diện CMS tương ứng
    const isFeedback = promo.image && promo.image.includes(",");
    const parsedPricing = parsePricingDescription(promo.description);

    if (isFeedback) {
      setEditPromoType("feedback");
      setEditDescription(promo.description);
      
      const imgs = promo.image ? promo.image.split(",").map(u => u.trim()) : [];
      setEditFeedbackImgBefore(imgs[0] || "");
      setEditFeedbackImgProgress(imgs[1] || "");
      setEditFeedbackImgAfter(imgs[2] || "");
      
      setEditImage("");
      setEditPricingRows([{ name: "", price: "" }]);
    } else if (parsedPricing) {
      setEditPromoType("pricing");
      setEditPricingRows(parsedPricing);
      
      setEditDescription("");
      setEditImage("");
      setEditFeedbackImgBefore("");
      setEditFeedbackImgProgress("");
      setEditFeedbackImgAfter("");
    } else {
      setEditPromoType("banner");
      setEditDescription(promo.description);
      setEditImage(promo.image || "");
      
      setEditFeedbackImgBefore("");
      setEditFeedbackImgProgress("");
      setEditFeedbackImgAfter("");
      setEditPricingRows([{ name: "", price: "" }]);
    }

    setShowEditModal(true);
  };

  // ==========================================
  // XỬ LÝ LƯU THÊM MỚI (SERIALIZE)
  // ==========================================
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError("Vui lòng điền tiêu đề chương trình");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    // Chuẩn bị dữ liệu dựa trên Loại hiển thị (CMS)
    let finalDescription = description;
    let finalImage: string | null = image || null;

    if (promoType === "pricing") {
      // Tuần tự hóa bảng giá thành dạng "Tên dịch vụ: Giá" trên từng dòng
      const validRows = pricingRows.filter(r => r.name.trim() && r.price.trim());
      if (validRows.length === 0) {
        setError("Vui lòng nhập ít nhất một dòng dịch vụ đầy đủ thông tin");
        setLoading(false);
        return;
      }
      finalDescription = validRows.map(r => `${r.name.trim()}: ${r.price.trim()}`).join("\n");
      finalImage = null;
    } else if (promoType === "feedback") {
      // Tuần tự hóa 3 ảnh feedback thành danh sách ngăn cách bằng dấu phẩy
      if (!description.trim()) {
        setError("Vui lòng nhập nội dung chia sẻ thực tế của khách hàng");
        setLoading(false);
        return;
      }
      const imgs = [feedbackImgBefore, feedbackImgProgress, feedbackImgAfter]
        .map(url => url.trim())
        .filter(Boolean);
      if (imgs.length === 0) {
        setError("Vui lòng nhập ít nhất một đường dẫn hình ảnh kết quả");
        setLoading(false);
        return;
      }
      finalImage = imgs.join(", ");
    } else {
      if (!description.trim()) {
        setError("Vui lòng nhập nội dung mô tả chi tiết chương trình");
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: finalDescription,
          image: finalImage,
          isActive,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo ưu đãi");

      setSuccess("Tạo chương trình ưu đãi mới thành công!");
      setPromotions([data, ...promotions]);
      
      // Reset form
      setTitle("");
      setDescription("");
      setImage("");
      setIsActive(true);
      setPricingRows([{ name: "", price: "" }]);
      setFeedbackImgBefore("");
      setFeedbackImgProgress("");
      setFeedbackImgAfter("");
      setPromoType("banner");
      setShowAddModal(false);
      
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // XỬ LÝ LƯU CẬP NHẬT (SERIALIZE)
  // ==========================================
  const handleUpdatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo || !editTitle) {
      setError("Vui lòng nhập tiêu đề chương trình");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    // Chuẩn bị dữ liệu dựa trên Loại hiển thị (CMS)
    let finalDescription = editDescription;
    let finalImage: string | null = editImage || null;

    if (editPromoType === "pricing") {
      const validRows = editPricingRows.filter(r => r.name.trim() && r.price.trim());
      if (validRows.length === 0) {
        setError("Vui lòng nhập ít nhất một dòng dịch vụ đầy đủ thông tin");
        setLoading(false);
        return;
      }
      finalDescription = validRows.map(r => `${r.name.trim()}: ${r.price.trim()}`).join("\n");
      finalImage = null;
    } else if (editPromoType === "feedback") {
      if (!editDescription.trim()) {
        setError("Vui lòng nhập nội dung chia sẻ thực tế của khách hàng");
        setLoading(false);
        return;
      }
      const imgs = [editFeedbackImgBefore, editFeedbackImgProgress, editFeedbackImgAfter]
        .map(url => url.trim())
        .filter(Boolean);
      if (imgs.length === 0) {
        setError("Vui lòng nhập ít nhất một đường dẫn hình ảnh kết quả");
        setLoading(false);
        return;
      }
      finalImage = imgs.join(", ");
    } else {
      if (!editDescription.trim()) {
        setError("Vui lòng nhập nội dung mô tả chi tiết chương trình");
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/promotions/${editingPromo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: finalDescription,
          image: finalImage,
          isActive: editIsActive,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật ưu đãi");

      setSuccess("Cập nhật chương trình ưu đãi thành công!");
      setPromotions(promotions.map((p) => (p.id === editingPromo.id ? data : p)));
      setShowEditModal(false);
      setEditingPromo(null);
      
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

      {error && <div className={styles.errorAlert} style={{ marginTop: "1rem" }}>{error}</div>}
      {success && <div className={styles.successAlert} style={{ marginTop: "1rem" }}>{success}</div>}

      {/* TABS CONTENT 1: REGISTRATIONS LIST */}
      {activeTab === "leads" && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Khách hàng đăng ký giữ suất ưu đãi</h3>
          
          <div className={styles.sectionCard} style={{ overflowX: "auto", padding: 0 }}>
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
                    <th>Số điện thoại</th>
                    <th>Chương trình đăng ký</th>
                    <th>Thời gian</th>
                    <th>Ghi chú</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id}>
                      <td style={{ fontWeight: 600 }}>{reg.customerName}</td>
                      <td>
                        <a href={`tel:${reg.customerPhone}`} className={styles.phoneLink}>
                          {reg.customerPhone}
                        </a>
                      </td>
                      <td style={{ color: "var(--accent-gold)", fontWeight: 600 }}>{reg.promotionTitle}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDateTime(reg.createdAt)}</td>
                      <td style={{ fontSize: "0.85rem", maxWidth: "200px", whiteSpace: "normal" }}>{reg.notes || "-"}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${
                          reg.status === "contacted" ? styles.statusSuccess : reg.status === "cancelled" ? styles.statusDanger : styles.statusPending
                        }`}>
                          {reg.status === "contacted" ? "Đã liên hệ" : reg.status === "cancelled" ? "Đã hủy" : "Chờ liên hệ"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          {reg.status === "pending" && (
                            <button
                              onClick={() => handleUpdateRegistrationStatus(reg.id, "contacted")}
                              className={`${styles.actionBtnSmall} ${styles.btnSuccess}`}
                              title="Đánh dấu đã liên hệ"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRegistration(reg.id)}
                            className={`${styles.actionBtnSmall} ${styles.btnDanger}`}
                            title="Xóa hồ sơ"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
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
            <button onClick={() => { setPromoType("banner"); setShowAddModal(true); }} className={styles.addBtn}>
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
              {promotions.map((promo) => {
                const parsedPricing = parsePricingDescription(promo.description);
                const isFeedback = promo.image && promo.image.includes(",");
                let badgeText = "Banner quảng cáo";
                if (parsedPricing) badgeText = "Bảng giá dịch vụ";
                if (isFeedback) badgeText = "Testimonial / Feedback";

                return (
                  <div key={promo.id} className={`${styles.promoCard} ${!promo.isActive ? styles.promoCardInactive : ""}`}>
                    <div className={styles.promoCardHeader}>
                      <div>
                        <h4 className={styles.promoTitle}>{promo.title}</h4>
                        <span style={{ fontSize: "0.72rem", color: "var(--accent-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                          [{badgeText}]
                        </span>
                      </div>
                      <span className={`${styles.badge} ${promo.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                        {promo.isActive ? "Đang chạy" : "Tạm ngưng"}
                      </span>
                    </div>
                    
                    {parsedPricing ? (
                      <div style={{ background: "rgba(223,183,108,0.02)", border: "1px dashed rgba(223,183,108,0.2)", borderRadius: "8px", padding: "0.75rem", margin: "0.75rem 0" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-gold)", marginBottom: "0.5rem" }}>Danh sách cột giá trị (CMS):</div>
                        {parsedPricing.map((row, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.2rem 0", borderBottom: idx === parsedPricing.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                            <span style={{ color: "var(--text-secondary)" }}>{row.name}</span>
                            <span style={{ fontWeight: "bold" }}>{row.price}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.promoDesc}>{promo.description}</p>
                    )}
                    
                    {promo.image && !isFeedback && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", marginBottom: "0.5rem", wordBreak: "break-all" }}>
                        Link ảnh: {promo.image}
                      </div>
                    )}

                    {isFeedback && (
                      <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "8px", padding: "0.75rem", margin: "0.75rem 0" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-gold)", marginBottom: "0.3rem" }}>Dàn 3 ảnh Trước/Sau (CMS):</div>
                        <div style={{ display: "flex", gap: "0.4rem", fontSize: "0.7rem", color: "var(--text-secondary)", wordBreak: "break-all", flexDirection: "column" }}>
                          <div>• Ảnh trước: {promo.image?.split(",")[0]?.trim()}</div>
                          <div>• Sau 1 buổi: {promo.image?.split(",")[1]?.trim()}</div>
                          <div>• Sau liệu trình: {promo.image?.split(",")[2]?.trim()}</div>
                        </div>
                      </div>
                    )}

                    <div className={styles.promoCardActions}>
                      <button
                        onClick={() => handleOpenEditModal(promo)}
                        className={styles.actionBtnSmall}
                        style={{ backgroundColor: "var(--accent-gold)", color: "#ffffff", border: "none" }}
                      >
                        Sửa
                      </button>
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          MODAL 1: CREATE PROMOTION MODAL (CMS STYLE)
          ========================================== */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "600px" }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--text-primary)" }}>Tạo cấu hình hiển thị mới (CMS)</h3>
              <button onClick={() => setShowAddModal(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className={styles.form}>
              {/* Dropdown chọn loại hiển thị */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Loại hiển thị trên trang chủ *</label>
                <select
                  className={styles.input}
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value as any)}
                  disabled={loading}
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  <option value="banner">Banner quảng cáo tiêu chuẩn (1 hình ảnh)</option>
                  <option value="pricing">Bảng giá dịch vụ (Dạng bảng cột)</option>
                  <option value="feedback">Nhật ký khách hàng - Real Story (3 ảnh Trước/Sau)</option>
                </select>
              </div>

              {/* Tiêu đề chung */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {promoType === "pricing" ? "Tiêu đề bảng giá * (Ví dụ: Dịch vụ nổi bật)" : "Tiêu đề ưu đãi / Tên khách hàng * (Ví dụ: TẤM)"}
                </label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder={promoType === "pricing" ? "Ví dụ: Dịch vụ nổi bật" : "Ví dụ: TẤM hoặc Giảm 50% Meso"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* PHẦN 1: BẢNG GIÁ DỊCH VỤ (DẠNG HÀNG ĐỘNG - TABLE EDITOR) */}
              {promoType === "pricing" && (
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ marginBottom: "0.75rem" }}>Danh sách cột dịch vụ & giá bán *</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {pricingRows.map((row, index) => (
                      <div key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Tên dịch vụ (Ví dụ: Meso không kim)"
                          value={row.name}
                          onChange={(e) => {
                            const newRows = [...pricingRows];
                            newRows[index].name = e.target.value;
                            setPricingRows(newRows);
                          }}
                          required
                          disabled={loading}
                          style={{ flex: 2 }}
                        />
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Giá (Ví dụ: 1.000.000)"
                          value={row.price}
                          onChange={(e) => {
                            const newRows = [...pricingRows];
                            newRows[index].price = e.target.value;
                            setPricingRows(newRows);
                          }}
                          required
                          disabled={loading}
                          style={{ flex: 1 }}
                        />
                        {pricingRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPricingRows(pricingRows.filter((_, idx) => idx !== index));
                            }}
                            className={styles.cancelBtn}
                            style={{ padding: "0.5rem", width: "auto", marginTop: 0, border: "1px solid var(--border-color)", minWidth: "40px", fontSize: "1.2rem", fontWeight: "bold", color: "var(--text-secondary)" }}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPricingRows([...pricingRows, { name: "", price: "" }])}
                    className={styles.addBtn}
                    style={{ marginTop: "0.75rem", width: "100%", justifyContent: "center", borderStyle: "dashed" }}
                    disabled={loading}
                  >
                    + Thêm dòng dịch vụ
                  </button>
                </div>
              )}

              {/* PHẦN 2: BANNER QUẢNG CÁO TIÊU CHUẨN */}
              {promoType === "banner" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nội dung chi tiết chương trình *</label>
                    <textarea
                      className={styles.textarea}
                      rows={4}
                      placeholder="Mô tả chi tiết chương trình khuyến mãi và cách thức tham gia..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Đường dẫn hình ảnh banner (Không bắt buộc)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="https://example.com/promo-image.jpg"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {/* PHẦN 3: NHẬT KÝ KHÁCH HÀNG (FEEDBACK/TESTIMONIAL) */}
              {promoType === "feedback" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nội dung chia sẻ/trải nghiệm thực tế của Khách hàng *</label>
                    <textarea
                      className={styles.textarea}
                      rows={4}
                      placeholder="Hơn 30 sao Việt và hàng chục nghìn khách hàng chia sẻ những hình ảnh..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ border: "1px dashed rgba(223,183,108,0.2)", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", background: "rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-gold)" }}>Bộ 3 hình ảnh so sánh kết quả (Nhập URL ảnh):</div>
                    
                    <div className={styles.formGroup}>
                      <label className={styles.label} style={{ fontSize: "0.75rem" }}>Ảnh trước khi làm (Ảnh 1) *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ví dụ: https://images.unsplash.com/photo-..."
                        value={feedbackImgBefore}
                        onChange={(e) => setFeedbackImgBefore(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label} style={{ fontSize: "0.75rem" }}>Ảnh sau 1 buổi (Ảnh 2) *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ví dụ: https://images.unsplash.com/photo-..."
                        value={feedbackImgProgress}
                        onChange={(e) => setFeedbackImgProgress(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label} style={{ fontSize: "0.75rem" }}>Ảnh sau liệu trình (Ảnh 3) *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ví dụ: https://images.unsplash.com/photo-..."
                        value={feedbackImgAfter}
                        onChange={(e) => setFeedbackImgAfter(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Kích hoạt ngay */}
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

              {/* Thao tác gửi */}
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.cancelBtn} disabled={loading}>
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? "Đang xử lý..." : "Tạo hiển thị"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: EDIT PROMOTION MODAL (CMS STYLE)
          ========================================== */}
      {showEditModal && editingPromo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "600px" }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--text-primary)" }}>Chỉnh sửa cấu hình hiển thị (CMS)</h3>
              <button onClick={() => { setShowEditModal(false); setEditingPromo(null); }} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdatePromo} className={styles.form}>
              {/* Dropdown chọn loại hiển thị */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Loại hiển thị trên trang chủ *</label>
                <select
                  className={styles.input}
                  value={editPromoType}
                  onChange={(e) => setEditPromoType(e.target.value as any)}
                  disabled={loading}
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  <option value="banner">Banner quảng cáo tiêu chuẩn (1 hình ảnh)</option>
                  <option value="pricing">Bảng giá dịch vụ (Dạng bảng cột)</option>
                  <option value="feedback">Nhật ký khách hàng - Real Story (3 ảnh Trước/Sau)</option>
                </select>
              </div>

              {/* Tiêu đề chung */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {editPromoType === "pricing" ? "Tiêu đề bảng giá * (Ví dụ: Dịch vụ nổi bật)" : "Tiêu đề ưu đãi / Tên khách hàng * (Ví dụ: TẤM)"}
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* PHẦN 1: BẢNG GIÁ DỊCH VỤ (DẠNG HÀNG ĐỘNG - TABLE EDITOR) */}
              {editPromoType === "pricing" && (
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ marginBottom: "0.75rem" }}>Danh sách cột dịch vụ & giá bán *</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {editPricingRows.map((row, index) => (
                      <div key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Tên dịch vụ"
                          value={row.name}
                          onChange={(e) => {
                            const newRows = [...editPricingRows];
                            newRows[index].name = e.target.value;
                            setEditPricingRows(newRows);
                          }}
                          required
                          disabled={loading}
                          style={{ flex: 2 }}
                        />
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Giá tiền"
                          value={row.price}
                          onChange={(e) => {
                            const newRows = [...editPricingRows];
                            newRows[index].price = e.target.value;
                            setEditPricingRows(newRows);
                          }}
                          required
                          disabled={loading}
                          style={{ flex: 1 }}
                        />
                        {editPricingRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditPricingRows(editPricingRows.filter((_, idx) => idx !== index));
                            }}
                            className={styles.cancelBtn}
                            style={{ padding: "0.5rem", width: "auto", marginTop: 0, border: "1px solid var(--border-color)", minWidth: "40px", fontSize: "1.2rem", fontWeight: "bold", color: "var(--text-secondary)" }}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditPricingRows([...editPricingRows, { name: "", price: "" }])}
                    className={styles.addBtn}
                    style={{ marginTop: "0.75rem", width: "100%", justifyContent: "center", borderStyle: "dashed" }}
                    disabled={loading}
                  >
                    + Thêm dòng dịch vụ
                  </button>
                </div>
              )}

              {/* PHẦN 2: BANNER QUẢNG CÁO TIÊU CHUẨN */}
              {editPromoType === "banner" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nội dung chi tiết chương trình *</label>
                    <textarea
                      className={styles.textarea}
                      rows={4}
                      placeholder="Mô tả chi tiết..."
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Đường dẫn hình ảnh banner (Không bắt buộc)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="https://example.com/promo-image.jpg"
                      value={editImage}
                      onChange={(e) => setEditImage(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {/* PHẦN 3: NHẬT KÝ KHÁCH HÀNG (FEEDBACK/TESTIMONIAL) */}
              {editPromoType === "feedback" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nội dung chia sẻ thực tế của Khách hàng *</label>
                    <textarea
                      className={styles.textarea}
                      rows={4}
                      placeholder="Chia sẻ thực tế của khách hàng..."
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ border: "1px dashed rgba(223,183,108,0.2)", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", background: "rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-gold)" }}>Bộ 3 hình ảnh so sánh kết quả (Nhập URL ảnh):</div>
                    
                    <div className={styles.formGroup}>
                      <label className={styles.label} style={{ fontSize: "0.75rem" }}>Ảnh trước khi làm (Ảnh 1) *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="https://images.unsplash.com/photo-..."
                        value={editFeedbackImgBefore}
                        onChange={(e) => setEditFeedbackImgBefore(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label} style={{ fontSize: "0.75rem" }}>Ảnh sau 1 buổi (Ảnh 2) *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="https://images.unsplash.com/photo-..."
                        value={editFeedbackImgProgress}
                        onChange={(e) => setEditFeedbackImgProgress(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label} style={{ fontSize: "0.75rem" }}>Ảnh sau liệu trình (Ảnh 3) *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="https://images.unsplash.com/photo-..."
                        value={editFeedbackImgAfter}
                        onChange={(e) => setEditFeedbackImgAfter(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Kích hoạt ngay */}
              <div className={styles.formGroup} style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  disabled={loading}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="editIsActive" style={{ fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>Kích hoạt hiển thị cho Khách hàng</label>
              </div>

              {/* Thao tác gửi */}
              <div className={styles.formActions}>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingPromo(null); }} className={styles.cancelBtn} disabled={loading}>
                  Hủy bỏ
                </button>
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? "Đang xử lý..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
