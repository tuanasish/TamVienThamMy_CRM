"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/config/page.module.css";
import { Plus, Edit2, Trash2, Check, X, Search } from "lucide-react";

interface ServiceProp {
  id: string;
  name: string;
  price: number;
  tags: string[];
}

interface StaffServicesCrudProps {
  initialServices: ServiceProp[];
}

export default function StaffServicesCrud({ initialServices }: StaffServicesCrudProps) {
  const router = useRouter();

  // Create form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editTags, setEditTags] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const tagsArray = tags
        ? tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: Number(price),
          tags: tagsArray,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo dịch vụ mới");

      setName("");
      setPrice("");
      setTags("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit Handlers
  const startEdit = (sv: ServiceProp) => {
    setEditingId(sv.id);
    setEditName(sv.name);
    setEditPrice(sv.price.toString());
    setEditTags(sv.tags.join(", "));
  };

  const saveEdit = async (id: string) => {
    setError("");
    setLoading(true);
    try {
      const tagsArray = editTags
        ? editTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const response = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          price: Number(editPrice),
          tags: tagsArray,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật dịch vụ");

      setEditingId(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string, serviceName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${serviceName}" không?`)) return;
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

  // Filter services by search query
  const filteredServices = initialServices.filter((sv) =>
    sv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sv.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={styles.contentCard}>
      {error && (
        <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "1rem", borderRadius: "4px", fontSize: "0.95rem", fontWeight: "600", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      <div className={styles.splitGrid}>
        {/* Left Side: Create Form */}
        <form onSubmit={handleCreate} className={styles.formBox}>
          <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Thêm dịch vụ mới</h3>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Tên dịch vụ *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Chăm sóc da mặt chuyên sâu"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={price}
              onChange={(e) => setPrice(e.target.value)}
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
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <Plus size={16} /> Lưu dịch vụ
          </button>
        </form>

        {/* Right Side: Services List */}
        <div className={styles.listColumn}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Danh mục dịch vụ hiện có</h3>
            
            {/* Search Input */}
            <div style={{ position: "relative", width: "220px" }}>
              <input
                type="text"
                placeholder="Tìm tên hoặc tag..."
                className={styles.input}
                style={{ paddingLeft: "2rem", fontSize: "0.85rem" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className={styles.emptyText}>Không tìm thấy dịch vụ nào.</div>
          ) : (
            filteredServices.map((sv) => (
              <div key={sv.id} className={styles.listItem} style={{ flexDirection: "column", gap: "0.75rem", alignItems: "stretch" }}>
                {editingId === sv.id ? (
                  /* Edit Mode */
                  <div className={styles.formBox} style={{ border: "none", padding: 0, gap: "0.85rem" }}>
                    <input
                      type="text"
                      className={styles.input}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Tên dịch vụ"
                      required
                    />
                    <input
                      type="number"
                      className={styles.input}
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="Giá dịch vụ (đ)"
                      required
                    />
                    <input
                      type="text"
                      className={styles.input}
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags (cách nhau bằng dấu phẩy)"
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => saveEdit(sv.id)}
                        className={styles.submitBtn}
                        style={{ flex: 1, padding: "0.5rem" }}
                        disabled={loading}
                      >
                        <Check size={16} /> Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
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
                          onClick={() => startEdit(sv)}
                          style={{ background: "transparent", color: "var(--text-secondary)", border: "none", cursor: "pointer", padding: "0.25rem" }}
                          title="Sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(sv.id, sv.name)}
                          style={{ background: "transparent", color: "var(--accent-rose)", border: "none", cursor: "pointer", padding: "0.25rem" }}
                          title="Xóa"
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
    </div>
  );
}
