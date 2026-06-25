"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/customers/page.module.css";
import { RefreshCw, X, Plus, Trash2, Check } from "lucide-react";

interface ServiceProp {
  id: string;
  name: string;
  price: number;
  type: string;
}

interface StaffProp {
  id: string;
  fullName: string;
}

interface ExchangeServiceModalProps {
  customerId: string;
  customerName: string;
  treatment: {
    id: string;
    usedSessions: number;
    totalSessions: number;
    pricePaid: number;
    service: { id: string; name: string };
  };
  services: ServiceProp[];
  staffMembers: StaffProp[];
}

interface SelectedItem {
  id: string;
  name: string;
  itemType: "service" | "product";
  price: number;
  quantity: number;
  totalSessions?: number;
  discount: string;
  saleStaffIds: string[];
}

const formatMoneyInput = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseMoneyInput = (val: string) => {
  return val.replace(/\./g, "");
};

const formatVND = (value: number) => {
  return value.toLocaleString("vi-VN") + "đ";
};

export default function ExchangeServiceModal({
  customerId,
  customerName,
  treatment,
  services,
  staffMembers,
}: ExchangeServiceModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Exchange states
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedItemType, setSelectedItemType] = useState<"service" | "product">("service");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  const [cashierId, setCashierId] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Calculate refund value of the old package
  const oldServicePrice = services.find((s) => s.id === treatment.service.id)?.price || 0;
  const refundValue = Math.max(0, treatment.pricePaid - treatment.usedSessions * oldServicePrice);

  // New purchase total
  const totalAmount = selectedItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // Since it is direct exchange, no additional discount is applied at invoice level
  const finalAmount = totalAmount;

  // Remainder to pay (Should always be 0 for valid exchange)
  const remainderToPay = Math.max(0, finalAmount - refundValue);

  // Pre-populate defaults on open
  const handleOpen = () => {
    setError("");
    setSelectedItems([]);
    setInternalNotes("");
    if (staffMembers.length > 0) {
      setCashierId(staffMembers[0].id);
    }
    setIsOpen(true);
  };

  const handleAddItem = () => {
    setError("");
    if (!selectedItemId) return;

    const s = services.find((sv) => sv.id === selectedItemId);
    if (s) {
      // Check if selected item is card (Not allowed)
      if (s.type === "card") {
        setError("Không được phép chọn đổi sang thẻ thành viên");
        return;
      }

      const itemDetails: SelectedItem = {
        id: s.id,
        name: s.name,
        itemType: s.type as "service" | "product",
        price: s.price,
        quantity: 1,
        discount: "0",
        totalSessions: s.type === "service" ? 10 : undefined, // default sessions for service
        saleStaffIds: cashierId ? [cashierId] : [],
      };

      const exists = selectedItems.find((itm) => itm.id === itemDetails.id && itm.itemType === itemDetails.itemType);
      if (exists) {
        setError("Mặt hàng này đã có trong danh sách chọn đổi");
        return;
      }
      setSelectedItems([...selectedItems, itemDetails]);
      setSelectedItemId("");
      setItemSearch("");
    }
  };

  const handleItemStaffsChange = (id: string, type: string, checkedStaffIds: string[]) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === id && item.itemType === type ? { ...item, saleStaffIds: checkedStaffIds } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!cashierId) {
      setError("Vui lòng chọn nhân viên lập giao dịch");
      setLoading(false);
      return;
    }

    if (selectedItems.length === 0) {
      setError("Vui lòng chọn ít nhất một dịch vụ hoặc sản phẩm mới để đổi");
      setLoading(false);
      return;
    }

    if (finalAmount > refundValue) {
      setError("Chỉ được phép đổi sang dịch vụ/sản phẩm mới có tổng giá trị bằng hoặc nhỏ hơn giá trị quy đổi của gói cũ.");
      setLoading(false);
      return;
    }

    const missingStaff = selectedItems.find((itm) => !itm.saleStaffIds || itm.saleStaffIds.length === 0);
    if (missingStaff) {
      setError(`Vui lòng chọn ít nhất một nhân viên tư vấn cho "${missingStaff.name}"`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/invoices/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          staffId: cashierId,
          revokeCardIds: [],
          revokeTreatmentIds: [treatment.id],
          totalAmount,
          discount: 0,
          finalAmount,
          paidAmountOffset: finalAmount, // fully offset
          paidAmountCash: 0,
          paidAmountTransfer: 0,
          paidAmountHomeCredit: 0,
          paidAmountMiraeAsset: 0,
          paidAmountDebt: 0,
          bankFee: 0,
          internalNotes: internalNotes ? `[Đổi trực tiếp dịch vụ] ${internalNotes}` : `[Đổi trực tiếp dịch vụ] Đổi từ gói ${treatment.service.name} sang gói mới`,
          performedBy: staffMembers.find((s) => s.id === cashierId)?.fullName || "Hệ thống",
          newItems: selectedItems.map((itm) => ({
            itemType: itm.itemType,
            itemId: itm.id,
            price: itm.price,
            quantity: itm.quantity,
            totalSessions: itm.itemType === "service" ? itm.totalSessions : undefined,
            discount: 0,
            staffId: itm.saleStaffIds?.[0] ? itm.saleStaffIds[0].split(":")[0] : null,
            saleStaffIds: itm.saleStaffIds || [],
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đổi dịch vụ trực tiếp thất bại");

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter services to only show matching search query and type, EXCLUDING card templates
  const filteredItems = services
    .filter((sv) => sv.type === selectedItemType)
    .filter((sv) => sv.name.toLowerCase().includes(itemSearch.toLowerCase()));

  return (
    <>
      <button
        onClick={handleOpen}
        className={styles.createBtn}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.45rem 0.75rem",
          background: "rgba(212, 175, 55, 0.1)",
          border: "1px solid var(--accent-gold)",
          color: "var(--accent-gold)",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontWeight: 600,
          cursor: "pointer",
          marginTop: "0.75rem",
          width: "fit-content",
        }}
      >
        <RefreshCw size={12} />
        <span>Đổi dịch vụ</span>
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modal}
            style={{
              maxWidth: "850px",
              width: "95%",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Đổi trực tiếp dịch vụ - Khách hàng: <span style={{ color: "var(--accent-gold)" }}>{customerName}</span>
              </h3>
              <X className={styles.modalClose} onClick={() => setIsOpen(false)} size={20} />
            </div>

            {error && (
              <div
                style={{
                  color: "#dc3545",
                  background: "rgba(220,53,69,0.1)",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {/* Section 1: Display Old Package Info */}
              <div
                style={{
                  background: "rgba(212, 175, 55, 0.04)",
                  padding: "1rem",
                  borderRadius: "6px",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Gói liệu trình cần thu hồi</span>
                  <h4 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)", margin: "0.25rem 0" }}>
                    {treatment.service.name}
                  </h4>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "1rem" }}>
                    <span>Còn lại: <strong>{treatment.totalSessions - treatment.usedSessions}/{treatment.totalSessions} buổi</strong></span>
                    <span>Đã mua: <strong>{formatVND(treatment.pricePaid)}</strong></span>
                  </div>
                </div>
                <div style={{ textAlign: "right", paddingLeft: "1rem", borderLeft: "1px dashed var(--border-color)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>GIÁ TRỊ QUY ĐỔI CÒN LẠI</span>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-gold)", marginTop: "0.25rem" }}>
                    {formatVND(refundValue)}
                  </div>
                </div>
              </div>

              {/* Section 2: Choose new items */}
              <div
                style={{
                  background: "var(--bg-primary)",
                  padding: "1rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <h5 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "0.75rem", borderLeft: "3px solid var(--accent-gold)", paddingLeft: "0.5rem" }}>
                  CHỌN DỊCH VỤ / SẢN PHẨM MỚI ĐỂ ĐỔI
                </h5>

                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <select
                    className={styles.searchInput}
                    value={selectedItemType}
                    onChange={(e) => {
                      setSelectedItemType(e.target.value as any);
                      setSelectedItemId("");
                      setItemSearch("");
                    }}
                    style={{ padding: "0.45rem", fontSize: "0.85rem", width: "110px" }}
                  >
                    <option value="service">Dịch vụ lẻ</option>
                    <option value="product">Sản phẩm</option>
                  </select>

                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder={`Tìm kiếm tên ${selectedItemType === "service" ? "dịch vụ" : "sản phẩm"} mới...`}
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value);
                        setShowItemSuggestions(true);
                      }}
                      onFocus={() => setShowItemSuggestions(true)}
                      style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem" }}
                    />
                    
                    {showItemSuggestions && itemSearch && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                          maxHeight: "180px",
                          overflowY: "auto",
                          zIndex: 200,
                          boxShadow: "var(--shadow-md)",
                        }}
                      >
                        {filteredItems.length === 0 ? (
                          <div style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Không tìm thấy kết quả</div>
                        ) : (
                          filteredItems.map((itm) => (
                            <div
                              key={itm.id}
                              onClick={() => {
                                setSelectedItemId(itm.id);
                                setItemSearch(itm.name);
                                setShowItemSuggestions(false);
                              }}
                              style={{
                                padding: "0.45rem 0.75rem",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--border-color)",
                                fontSize: "0.85rem",
                              }}
                              className={styles.tr}
                            >
                              <span style={{ fontWeight: 600 }}>{itm.name}</span>
                              <span style={{ float: "right", color: "var(--accent-gold)" }}>
                                {formatVND(Number(itm.price))}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className={styles.createBtn}
                    style={{
                      padding: "0.45rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <Plus size={14} /> Thêm
                  </button>
                </div>

                {/* Selected list */}
                {selectedItems.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontStyle: "italic", textAlign: "center", padding: "1rem 0" }}>Chưa chọn dịch vụ/sản phẩm mới để đổi.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className={styles.table} style={{ fontSize: "0.8rem" }}>
                      <thead>
                        <tr>
                          <th className={styles.th} style={{ padding: "0.5rem" }}>Tên mặt hàng mới</th>
                          <th className={styles.th} style={{ padding: "0.5rem" }}>Giá bán</th>
                          <th className={styles.th} style={{ padding: "0.5rem", width: "60px" }}>SL</th>
                          {selectedItemType === "service" && <th className={styles.th} style={{ padding: "0.5rem", width: "70px" }}>Số buổi</th>}
                          <th className={styles.th} style={{ padding: "0.5rem" }}>Tư vấn (Chọn nhiều)</th>
                          <th className={styles.th} style={{ padding: "0.5rem", width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item, idx) => (
                          <tr key={`${item.id}-${idx}`} className={styles.tr}>
                            <td className={styles.td} style={{ fontWeight: 600, padding: "0.5rem" }}>{item.name}</td>
                            <td className={styles.td} style={{ padding: "0.5rem" }}>{formatVND(item.price)}</td>
                            <td className={styles.td} style={{ padding: "0.5rem" }}>
                              <input
                                type="number"
                                className={styles.searchInput}
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setSelectedItems(
                                    selectedItems.map((itm) =>
                                      itm.id === item.id && itm.itemType === item.itemType ? { ...itm, quantity: val } : itm
                                    )
                                  );
                                }}
                                style={{ padding: "0.2rem 0.4rem", fontSize: "0.8rem" }}
                              />
                            </td>
                            {selectedItemType === "service" && (
                              <td className={styles.td} style={{ padding: "0.5rem" }}>
                                {item.itemType === "service" ? (
                                  <input
                                    type="number"
                                    className={styles.searchInput}
                                    min="1"
                                    value={item.totalSessions || 1}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 1;
                                      setSelectedItems(
                                        selectedItems.map((itm) =>
                                          itm.id === item.id && itm.itemType === "service" ? { ...itm, totalSessions: val } : itm
                                        )
                                      );
                                    }}
                                    style={{ padding: "0.2rem 0.4rem", fontSize: "0.8rem" }}
                                  />
                                ) : "-"}
                              </td>
                            )}
                            <td className={styles.td} style={{ padding: "0.5rem" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", maxHeight: "60px", overflowY: "auto", border: "1px solid var(--border-color)", padding: "0.25rem", borderRadius: "4px" }}>
                                {staffMembers.map((st) => {
                                  const isChecked = (item.saleStaffIds || []).some(id => id === st.id || id.startsWith(st.id + ":"));
                                  return (
                                    <label key={st.id} style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.2rem",
                                      background: isChecked ? "rgba(212, 175, 55, 0.08)" : "var(--bg-secondary)",
                                      padding: "0.1rem 0.3rem",
                                      borderRadius: "3px",
                                      fontSize: "0.7rem",
                                      border: isChecked ? "1px solid var(--accent-gold)" : "1px solid transparent",
                                      color: isChecked ? "var(--accent-gold)" : "var(--text-primary)",
                                      fontWeight: isChecked ? 600 : 400,
                                      cursor: "pointer"
                                    }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let newIds = (item.saleStaffIds || []).filter(id => id !== st.id && !id.startsWith(st.id + ":"));
                                          if (e.target.checked) {
                                            newIds.push(st.id);
                                          }
                                          handleItemStaffsChange(item.id, item.itemType, newIds);
                                        }}
                                        style={{ accentColor: "var(--accent-gold)", cursor: "pointer", transform: "scale(0.85)" }}
                                      />
                                      <span>{st.fullName}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </td>
                            <td className={styles.td} style={{ padding: "0.5rem" }}>
                              <Trash2
                                size={14}
                                style={{ color: "#dc3545", cursor: "pointer" }}
                                onClick={() => setSelectedItems(selectedItems.filter((itm) => !(itm.id === item.id && itm.itemType === item.itemType)))}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 3: Summary and Confirmation */}
              <div
                style={{
                  background: "var(--bg-primary)",
                  padding: "1rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr",
                  gap: "1.5rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    <span>Giá trị gói cũ thu hồi:</span>
                    <strong>{formatVND(refundValue)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    <span>Tổng giá trị gói mới:</span>
                    <strong>{formatVND(finalAmount)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 700, borderTop: "1px dashed var(--border-color)", paddingTop: "0.4rem", color: "var(--accent-gold)" }}>
                    <span>Cần thanh toán thêm:</span>
                    <strong style={{ fontSize: "1.1rem" }}>{formatVND(remainderToPay)}</strong>
                  </div>

                  {remainderToPay > 0 && (
                    <div style={{ color: "#dc3545", background: "rgba(220, 53, 69, 0.05)", padding: "0.4rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", marginTop: "0.5rem", fontWeight: 600, border: "1px solid rgba(220, 53, 69, 0.12)" }}>
                      ⚠️ Gói mới đắt hơn gói cũ. Chỉ được đổi bằng hoặc rẻ hơn.
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label className={styles.label} style={{ fontSize: "0.75rem" }}>Nhân viên thu ngân *</label>
                    <select
                      className={styles.searchInput}
                      value={cashierId}
                      onChange={(e) => setCashierId(e.target.value)}
                      required
                      style={{ appearance: "auto", padding: "0.35rem", fontSize: "0.8rem" }}
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {staffMembers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label className={styles.label} style={{ fontSize: "0.75rem" }}>Ghi chú nội bộ</label>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Lý do đổi gói trực tiếp..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      style={{ padding: "0.35rem 0.5rem", fontSize: "0.8rem" }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setIsOpen(false)} className={styles.cancelBtn} disabled={loading} style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.createBtn}
                  disabled={loading || remainderToPay > 0 || selectedItems.length === 0}
                  style={{
                    padding: "0.45rem 1rem",
                    fontSize: "0.85rem",
                    background: (remainderToPay > 0 || selectedItems.length === 0) ? "var(--border-color)" : "var(--grad-premium)",
                    cursor: (remainderToPay > 0 || selectedItems.length === 0) ? "not-allowed" : "pointer"
                  }}
                >
                  {loading ? "Đang xử lý..." : "Xác nhận đổi gói"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
