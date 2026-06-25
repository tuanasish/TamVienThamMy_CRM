"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/services/page.module.css";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";

const formatMoneyInput = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseMoneyInput = (val: string) => {
  return val.replace(/\./g, "");
};

interface ServiceProp {
  id: string;
  name: string;
  price: number;
  type: string; // 'service' or 'product'
  notes: string;
  sessions?: number;
}

interface CardTemplateProp {
  id: string;
  name: string;
  price: number;
  value: number;
  services: string[]; // array of allowed service/product IDs
}

interface SpaConfigTabsProps {
  initialServices: ServiceProp[];
  initialTemplates: CardTemplateProp[];
  userRole: string;
}

export default function SpaConfigTabs({
  initialServices,
  initialTemplates,
  userRole,
}: SpaConfigTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"services" | "cards">("services");

  // Service form states
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceType, setServiceType] = useState("service"); // 'service' or 'product'
  const [serviceNotes, setServiceNotes] = useState("");
  const [serviceSessions, setServiceSessions] = useState("1");
  
  // Card form states
  const [cardName, setCardName] = useState("");
  const [cardPrice, setCardPrice] = useState("");
  const [cardValue, setCardValue] = useState("");
  const [cardServices, setCardServices] = useState<string[]>([]); // applicable items

  // Edit states
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServicePrice, setEditServicePrice] = useState("");
  const [editServiceType, setEditServiceType] = useState("service");
  const [editServiceNotes, setEditServiceNotes] = useState("");
  const [editServiceSessions, setEditServiceSessions] = useState("1");

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardName, setEditCardName] = useState("");
  const [editCardPrice, setEditCardPrice] = useState("");
  const [editCardValue, setEditCardValue] = useState("");
  const [editCardServices, setEditCardServices] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const servicesOnly = initialServices.filter((sv) => sv.type !== "product");
  const productsOnly = initialServices.filter((sv) => sv.type === "product");

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName,
          price: Number(parseMoneyInput(servicePrice)),
          type: serviceType,
          notes: serviceNotes,
          tags: serviceType === "service" ? { sessions: Number(serviceSessions) } : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo dịch vụ/sản phẩm mới");

      setServiceName("");
      setServicePrice("");
      setServiceType("service");
      setServiceNotes("");
      setServiceSessions("1");
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
          price: Number(parseMoneyInput(cardPrice)),
          value: Number(parseMoneyInput(cardValue)),
          services: cardServices,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo mẫu thẻ mới");

      setCardName("");
      setCardPrice("");
      setCardValue("");
      setCardServices([]);
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
    setEditServicePrice(formatMoneyInput(sv.price.toString()));
    setEditServiceType(sv.type || "service");
    setEditServiceNotes(sv.notes || "");
    setEditServiceSessions(sv.sessions ? sv.sessions.toString() : "1");
  };

  const saveEditService = async (id: string) => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editServiceName,
          price: Number(parseMoneyInput(editServicePrice)),
          type: editServiceType,
          notes: editServiceNotes,
          tags: editServiceType === "service" ? { sessions: Number(editServiceSessions) } : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật thông tin");

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
    if (!confirm("Bạn có chắc chắn muốn xóa mặt hàng này không?")) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa mặt hàng");

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
    setEditCardPrice(formatMoneyInput(t.price.toString()));
    setEditCardValue(formatMoneyInput(t.value.toString()));
    setEditCardServices(t.services || []);
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
          price: Number(parseMoneyInput(editCardPrice)),
          value: Number(parseMoneyInput(editCardValue)),
          services: editCardServices,
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
          Dịch vụ & Sản phẩm
        </button>
        <button
          onClick={() => { setActiveTab("cards"); setError(""); }}
          className={`${styles.tab} ${activeTab === "cards" ? styles.activeTab : ""}`}
        >
          Thẻ thành viên
        </button>
      </div>

      <div className={styles.contentCard} style={{ marginTop: "1.5rem" }}>
        {error && (
          <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "1rem", borderRadius: "4px", fontSize: "0.95rem", fontWeight: "600", marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        {activeTab === "services" ? (
          <div className={styles.splitGrid} style={userRole !== "admin" ? { gridTemplateColumns: "1fr" } : undefined}>
            {/* Form Column */}
            {userRole === "admin" && (
              <form onSubmit={handleCreateService} className={styles.formBox}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Thêm mặt hàng mới</h3>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Loại mặt hàng *</label>
                <select
                  className={styles.input}
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  required
                  disabled={loading}
                  style={{ appearance: "auto" }}
                >
                  <option value="service">Dịch vụ (Spa Treatment)</option>
                  <option value="product">Sản phẩm (Cosmetics/Items)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tên mặt hàng *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder={serviceType === "product" ? "Ví dụ: Kem chống nắng tế bào gốc" : "Ví dụ: Chăm sóc da mặt chuyên sâu"}
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Giá bán lẻ (đ) *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ví dụ: 1.500.000"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(formatMoneyInput(e.target.value))}
                  required
                  disabled={loading}
                />
              </div>

              {serviceType === "service" && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Số buổi của liệu trình/combo *</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="Ví dụ: 10 (mặc định = 1)"
                    value={serviceSessions}
                    onChange={(e) => setServiceSessions(e.target.value)}
                    min="1"
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Ghi chú / Ưu đãi</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ví dụ: Đang có ưu đãi giảm 10%"
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                <Plus size={16} /> Lưu mặt hàng
              </button>
            </form>
            )}

            {/* List Column */}
            <div className={styles.listColumn}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Danh sách mặt hàng hiện có</h3>
              {initialServices.length === 0 ? (
                <div className={styles.emptyText}>Chưa có dịch vụ/sản phẩm nào trong hệ thống.</div>
              ) : (
                initialServices.map((sv) => (
                  <div key={sv.id} className={styles.listItem} style={{ flexDirection: "column", gap: "0.75rem", alignItems: "stretch" }}>
                    {editingServiceId === sv.id ? (
                      /* Editing Mode */
                      <div className={styles.formBox} style={{ border: "none", padding: 0, gap: "0.85rem" }}>
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.75rem" }}>Loại</label>
                          <select
                            className={styles.input}
                            value={editServiceType}
                            onChange={(e) => setEditServiceType(e.target.value)}
                            style={{ appearance: "auto" }}
                          >
                            <option value="service">Dịch vụ</option>
                            <option value="product">Sản phẩm</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          className={styles.input}
                          value={editServiceName}
                          onChange={(e) => setEditServiceName(e.target.value)}
                          placeholder="Tên mặt hàng"
                          required
                        />
                        <input
                          type="text"
                          className={styles.input}
                          value={editServicePrice}
                          onChange={(e) => setEditServicePrice(formatMoneyInput(e.target.value))}
                          placeholder="Giá bán lẻ (đ)"
                          required
                        />
                        {editServiceType === "service" && (
                          <div className={styles.formGroup} style={{ gap: "0.2rem" }}>
                            <label className={styles.label} style={{ fontSize: "0.75rem", margin: 0 }}>Số buổi *</label>
                            <input
                              type="number"
                              className={styles.input}
                              value={editServiceSessions}
                              onChange={(e) => setEditServiceSessions(e.target.value)}
                              placeholder="Số buổi liệu trình"
                              min="1"
                              required
                            />
                          </div>
                        )}
                        <input
                          type="text"
                          className={styles.input}
                          value={editServiceNotes}
                          onChange={(e) => setEditServiceNotes(e.target.value)}
                          placeholder="Ghi chú / Ưu đãi (ví dụ: Đang ưu đãi 10%)"
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
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span className={styles.itemName}>{sv.name}</span>
                            <span 
                              className={sv.type === "product" ? styles.tag : styles.tag} 
                              style={{ 
                                fontSize: "0.65rem", 
                                padding: "0.1rem 0.35rem", 
                                borderRadius: "50px", 
                                background: sv.type === "product" ? "rgba(40, 167, 69, 0.1)" : "rgba(223, 183, 108, 0.1)",
                                color: sv.type === "product" ? "#28a745" : "var(--accent-gold)"
                              }}
                            >
                              {sv.type === "product" ? "Sản phẩm" : `Dịch vụ (${sv.sessions || 1} buổi)`}
                            </span>
                          </div>
                          {sv.notes && (
                            <div style={{ fontSize: "0.8rem", color: "var(--accent-gold)", fontStyle: "italic", marginTop: "0.25rem" }}>
                              Ghi chú: {sv.notes}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span className={styles.itemPrice} style={{ fontWeight: 700 }}>
                            {sv.price.toLocaleString("vi-VN")}đ
                          </span>
                          {userRole === "admin" && (
                            <div style={{ display: "flex", gap: "0.35rem" }}>
                              <button
                                onClick={() => startEditService(sv)}
                                style={{ background: "transparent", color: "var(--text-secondary)", border: "none", cursor: "pointer", padding: "0.25rem" }}
                                title="Sửa mặt hàng"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteService(sv.id)}
                                style={{ background: "transparent", color: "var(--accent-rose)", border: "none", cursor: "pointer", padding: "0.25rem" }}
                                title="Xóa mặt hàng"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className={styles.splitGrid} style={userRole !== "admin" ? { gridTemplateColumns: "1fr" } : undefined}>
            {/* Form Column */}
            {userRole === "admin" && (
              <form onSubmit={handleCreateCard} className={styles.formBox}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Thêm thẻ thành viên mới</h3>

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
                <label className={styles.label}>Giá bán thẻ (khách thực trả) (đ) *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ví dụ: 10.000.000"
                  value={cardPrice}
                  onChange={(e) => setCardPrice(formatMoneyInput(e.target.value))}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Mệnh giá nạp (giá trị thực nhận) (đ) *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ví dụ: 15.000.000"
                  value={cardValue}
                  onChange={(e) => setCardValue(formatMoneyInput(e.target.value))}
                  required
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Dịch vụ/Sản phẩm áp dụng (Để trống = Áp dụng tất cả)</label>
                <div style={{ maxHeight: "220px", overflowY: "auto", border: "1px solid var(--border-color)", padding: "0.75rem", borderRadius: "var(--radius-sm)", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {initialServices.length === 0 ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Chưa có dịch vụ/sản phẩm nào để liên kết.</span>
                  ) : (
                    <>
                      {/* Dịch vụ */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent-gold)", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.25rem", marginBottom: "0.4rem" }}>
                          Dịch vụ Spa ({servicesOnly.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", paddingLeft: "0.25rem" }}>
                          {servicesOnly.length === 0 ? (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Không có dịch vụ</span>
                          ) : (
                            servicesOnly.map((sv) => (
                              <label key={sv.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={cardServices.includes(sv.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCardServices([...cardServices, sv.id]);
                                    } else {
                                      setCardServices(cardServices.filter((id) => id !== sv.id));
                                    }
                                  }}
                                  disabled={loading}
                                />
                                {sv.name}
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Sản phẩm */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#28a745", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.25rem", marginBottom: "0.4rem" }}>
                          Sản phẩm bán lẻ ({productsOnly.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", paddingLeft: "0.25rem" }}>
                          {productsOnly.length === 0 ? (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Không có sản phẩm</span>
                          ) : (
                            productsOnly.map((sv) => (
                              <label key={sv.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={cardServices.includes(sv.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCardServices([...cardServices, sv.id]);
                                    } else {
                                      setCardServices(cardServices.filter((id) => id !== sv.id));
                                    }
                                  }}
                                  disabled={loading}
                                />
                                {sv.name}
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                <Plus size={16} /> Lưu thẻ thành viên
              </button>
            </form>
            )}

            {/* List Column */}
            <div className={styles.listColumn}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Danh sách mẫu thẻ thành viên</h3>
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
                          type="text"
                          className={styles.input}
                          value={editCardPrice}
                          onChange={(e) => setEditCardPrice(formatMoneyInput(e.target.value))}
                          placeholder="Giá bán thực trả (đ)"
                          required
                        />
                        <input
                          type="text"
                          className={styles.input}
                          value={editCardValue}
                          onChange={(e) => setEditCardValue(formatMoneyInput(e.target.value))}
                          placeholder="Mệnh giá thực nhận (đ)"
                          required
                        />
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.75rem" }}>Danh mục áp dụng (Để trống = Áp dụng tất cả)</label>
                          <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border-color)", padding: "0.5rem", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                            {/* Dịch vụ */}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--accent-gold)", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.15rem", marginBottom: "0.3rem" }}>
                                Dịch vụ Spa ({servicesOnly.length})
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", paddingLeft: "0.2rem" }}>
                                {servicesOnly.length === 0 ? (
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Không có dịch vụ</span>
                                ) : (
                                  servicesOnly.map((sv) => (
                                    <label key={sv.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer" }}>
                                      <input
                                        type="checkbox"
                                        checked={editCardServices.includes(sv.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setEditCardServices([...editCardServices, sv.id]);
                                          } else {
                                            setEditCardServices(editCardServices.filter((id) => id !== sv.id));
                                          }
                                        }}
                                        disabled={loading}
                                      />
                                      {sv.name}
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Sản phẩm */}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "#28a745", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.15rem", marginBottom: "0.3rem" }}>
                                Sản phẩm bán lẻ ({productsOnly.length})
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", paddingLeft: "0.2rem" }}>
                                {productsOnly.length === 0 ? (
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Không có sản phẩm</span>
                                ) : (
                                  productsOnly.map((sv) => (
                                    <label key={sv.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer" }}>
                                      <input
                                        type="checkbox"
                                        checked={editCardServices.includes(sv.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setEditCardServices([...editCardServices, sv.id]);
                                          } else {
                                            setEditCardServices(editCardServices.filter((id) => id !== sv.id));
                                          }
                                        }}
                                        disabled={loading}
                                      />
                                      {sv.name}
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
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
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
                            {userRole === "admin" && (
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
                            )}
                          </div>
                        </div>

                        {/* List of Allowed Items */}
                        <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "0.4rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Áp dụng cho:{" "}
                          {t.services && t.services.length > 0 ? (
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {t.services
                                .map((id) => initialServices.find((s) => s.id === id)?.name)
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          ) : (
                            <span style={{ fontStyle: "italic", color: "var(--accent-gold)" }}>Tất cả dịch vụ & sản phẩm</span>
                          )}
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
