"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/config/page.module.css";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";

interface ServiceProp {
  id: string;
  name: string;
  price: number;
  tags: string[];
}

interface CardTemplateProp {
  id: string;
  name: string;
  price: number;
  value: number;
}

interface SpaConfigTabsProps {
  initialServices: ServiceProp[];
  initialTemplates: CardTemplateProp[];
}

export default function SpaConfigTabs({
  initialServices,
  initialTemplates,
}: SpaConfigTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"services" | "cards">("services");

  // Service form states
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceTags, setServiceTags] = useState("");
  
  // Card form states
  const [cardName, setCardName] = useState("");
  const [cardPrice, setCardPrice] = useState("");
  const [cardValue, setCardValue] = useState("");

  // Edit states
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServicePrice, setEditServicePrice] = useState("");
  const [editServiceTags, setEditServiceTags] = useState("");

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardName, setEditCardName] = useState("");
  const [editCardPrice, setEditCardPrice] = useState("");
  const [editCardValue, setEditCardValue] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const tagsArray = serviceTags
        ? serviceTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName,
          price: Number(servicePrice),
          tags: tagsArray,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo dịch vụ mới");

      setServiceName("");
      setServicePrice("");
      setServiceTags("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cardName,
          price: Number(cardPrice),
          value: Number(cardValue),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo mẫu thẻ mới");

      setCardName("");
      setCardPrice("");
      setCardValue("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit Service Handler
  const startEditService = (sv: ServiceProp) => {
    setEditingServiceId(sv.id);
    setEditServiceName(sv.name);
    setEditServicePrice(sv.price.toString());
    setEditServiceTags(sv.tags.join(", "));
  };

  const saveEditService = async (id: string) => {
    setError("");
    setLoading(true);
    try {
      const tagsArray = editServiceTags
        ? editServiceTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const response = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editServiceName,
          price: Number(editServicePrice),
          tags: tagsArray,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật dịch vụ");

      setEditingServiceId(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Service Handler
  const handleDeleteService = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa dịch vụ này không?")) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa dịch vụ");

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit Card Handler
  const startEditCard = (t: CardTemplateProp) => {
    setEditingCardId(t.id);
    setEditCardName(t.name);
    setEditCardPrice(t.price.toString());
    setEditCardValue(t.value.toString());
  };

  const saveEditCard = async (id: string) => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCardName,
          price: Number(editCardPrice),
          value: Number(editCardValue),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật mẫu thẻ");

      setEditingCardId(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Card Handler
  const handleDeleteCard = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mẫu thẻ nạp này không?")) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa mẫu thẻ");

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Tabs selectors */}
      <div className={styles.tabsContainer}>
        <button
          onClick={() => { setActiveTab("services"); setError(""); }}
          className={`${styles.tab} ${activeTab === "services" ? styles.activeTab : ""}`}
        >
          Danh mục dịch vụ
        </button>
        <button
          onClick={() => { setActiveTab("cards"); setError(""); }}
          className={`${styles.tab} ${activeTab === "cards" ? styles.activeTab : ""}`}
        >
          Mẫu thẻ tài khoản
        </button>
      </div>

      <div className={styles.contentCard} style={{ marginTop: "1.5rem" }}>
        {error && (
          <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "1rem", borderRadius: "4px", fontSize: "0.95rem", fontWeight: "600", marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        {activeTab === "services" ? (
          <div className={styles.splitGrid}>
            {/* Form Column */}
            <form onSubmit={handleCreateService} className={styles.formBox}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Thêm dịch vụ mới</h3>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Tên dịch vụ *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Chăm sóc da mặt chuyên sâu"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Giá dịch vụ (đ) *</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Ví dụ: 1500000"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Thẻ nhãn tags (cách nhau bằng dấu phẩy)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="skincare, facial, massage"
                  value={serviceTags}
                  onChange={(e) => setServiceTags(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                <Plus size={16} /> Lưu dịch vụ
              </button>
            </form>

            {/* List Column */}
            <div className={styles.listColumn}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Danh sách dịch vụ hiện có</h3>
              {initialServices.length === 0 ? (
                <div className={styles.emptyText}>Chưa có dịch vụ nào trong hệ thống.</div>
              ) : (
                initialServices.map((sv) => (
                  <div key={sv.id} className={styles.listItem} style={{ flexDirection: "column", gap: "0.75rem", alignItems: "stretch" }}>
                    {editingServiceId === sv.id ? (
                      /* Editing Mode */
                      <div className={styles.formBox} style={{ border: "none", padding: 0, gap: "0.85rem" }}>
                        <input
                          type="text"
                          className={styles.input}
                          value={editServiceName}
                          onChange={(e) => setEditServiceName(e.target.value)}
                          placeholder="Tên dịch vụ"
                          required
                        />
                        <input
                          type="number"
                          className={styles.input}
                          value={editServicePrice}
                          onChange={(e) => setEditServicePrice(e.target.value)}
                          placeholder="Giá dịch vụ (đ)"
                          required
                        />
                        <input
                          type="text"
                          className={styles.input}
                          value={editServiceTags}
                          onChange={(e) => setEditServiceTags(e.target.value)}
                          placeholder="Tags (cách nhau bằng dấu phẩy)"
                        />
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={() => saveEditService(sv.id)}
                            className={styles.submitBtn}
                            style={{ flex: 1, padding: "0.5rem" }}
                            disabled={loading}
                          >
                            <Check size={16} /> Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingServiceId(null)}
                            className={styles.submitBtn}
                            style={{ flex: 1, padding: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
                            disabled={loading}
                          >
                            <X size={16} /> Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className={styles.itemInfo}>
                          <span className={styles.itemName}>{sv.name}</span>
                          <div className={styles.tagsList}>
                            {sv.tags.map((tag) => (
                              <span key={tag} className={styles.tag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span className={styles.itemPrice} style={{ fontWeight: 700 }}>
                            {sv.price.toLocaleString("vi-VN")}đ
                          </span>
                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            <button
                              onClick={() => startEditService(sv)}
                              style={{ background: "transparent", color: "var(--text-secondary)", border: "none", cursor: "pointer", padding: "0.25rem" }}
                              title="Sửa dịch vụ"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteService(sv.id)}
                              style={{ background: "transparent", color: "var(--accent-rose)", border: "none", cursor: "pointer", padding: "0.25rem" }}
                              title="Xóa dịch vụ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className={styles.splitGrid}>
            {/* Form Column */}
            <form onSubmit={handleCreateCard} className={styles.formBox}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Thêm mẫu thẻ nạp mới</h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tên thẻ nạp *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Thẻ Gold 10M"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Giá gốc khách thực trả (đ) *</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Ví dụ: 10000000"
                  value={cardPrice}
                  onChange={(e) => setCardPrice(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Giá trị thực nhận trong thẻ (đ) *</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Ví dụ: 15000000"
                  value={cardValue}
                  onChange={(e) => setCardValue(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                <Plus size={16} /> Lưu mẫu thẻ
              </button>
            </form>

            {/* List Column */}
            <div className={styles.listColumn}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Danh sách mẫu thẻ nạp hiện có</h3>
              {initialTemplates.length === 0 ? (
                <div className={styles.emptyText}>Chưa có mẫu thẻ nạp nào.</div>
              ) : (
                initialTemplates.map((t) => (
                  <div key={t.id} className={styles.listItem} style={{ flexDirection: "column", gap: "0.75rem", alignItems: "stretch" }}>
                    {editingCardId === t.id ? (
                      /* Editing Mode */
                      <div className={styles.formBox} style={{ border: "none", padding: 0, gap: "0.85rem" }}>
                        <input
                          type="text"
                          className={styles.input}
                          value={editCardName}
                          onChange={(e) => setEditCardName(e.target.value)}
                          placeholder="Tên thẻ nạp"
                          required
                        />
                        <input
                          type="number"
                          className={styles.input}
                          value={editCardPrice}
                          onChange={(e) => setEditCardPrice(e.target.value)}
                          placeholder="Giá gốc thực trả (đ)"
                          required
                        />
                        <input
                          type="number"
                          className={styles.input}
                          value={editCardValue}
                          onChange={(e) => setEditCardValue(e.target.value)}
                          placeholder="Giá trị thực nhận (đ)"
                          required
                        />
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            onClick={() => saveEditCard(t.id)}
                            className={styles.submitBtn}
                            style={{ flex: 1, padding: "0.5rem" }}
                            disabled={loading}
                          >
                            <Check size={16} /> Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCardId(null)}
                            className={styles.submitBtn}
                            style={{ flex: 1, padding: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
                            disabled={loading}
                          >
                            <X size={16} /> Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className={styles.itemInfo}>
                          <span className={styles.itemName}>{t.name}</span>
                          <span className={styles.itemPrice}>
                            Thực trả: <strong>{t.price.toLocaleString("vi-VN")}đ</strong>
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <div style={{ textAlign: "right" }}>
                            <span className={styles.itemPrice} style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              Số dư nạp:
                            </span>
                            <strong style={{ color: "var(--accent-gold)", fontSize: "1.1rem" }}>
                              {t.value.toLocaleString("vi-VN")}đ
                            </strong>
                          </div>
                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            <button
                              onClick={() => startEditCard(t)}
                              style={{ background: "transparent", color: "var(--text-secondary)", border: "none", cursor: "pointer", padding: "0.25rem" }}
                              title="Sửa mẫu thẻ"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCard(t.id)}
                              style={{ background: "transparent", color: "var(--accent-rose)", border: "none", cursor: "pointer", padding: "0.25rem" }}
                              title="Xóa mẫu thẻ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
