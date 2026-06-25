"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/customers/page.module.css";
import { Activity, X, Plus, Trash2, Check, DollarSign } from "lucide-react";

interface CustomerCardProp {
  id: string;
  name: string;
  currentBalance: number;
  originalPrice: number;
  originalValue: number;
}

interface CustomerTreatmentProp {
  id: string;
  usedSessions: number;
  totalSessions: number;
  service: { id: string; name: string };
  pricePaid: number;
  servicePrice?: number; // Retail price from database
}

interface ServiceProp {
  id: string;
  name: string;
  price: number;
  type: string;
}

interface CardTemplateProp {
  id: string;
  name: string;
  price: number;
  value: number;
}

interface StaffProp {
  id: string;
  fullName: string;
}

interface ConvertPackageModalProps {
  customerId: string;
  customerName: string;
  cards: CustomerCardProp[];
  treatments: CustomerTreatmentProp[];
  services: ServiceProp[];
  cardTemplates: CardTemplateProp[];
  staffMembers: StaffProp[];
}

interface SelectedItem {
  id: string;
  name: string;
  itemType: "service" | "product" | "card";
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

export default function ConvertPackageModal({
  customerId,
  customerName,
  cards,
  treatments,
  services,
  cardTemplates,
  staffMembers,
}: ConvertPackageModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Revoke states
  const [selectedCards, setSelectedCards] = useState<Record<string, boolean>>({});
  const [selectedTreatments, setSelectedTreatments] = useState<Record<string, boolean>>({});

  // Purchase states
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedItemType, setSelectedItemType] = useState<"service" | "product" | "card">("service");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  // Payment states
  const [cashierId, setCashierId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [installmentMonths, setInstallmentMonths] = useState("1");
  const [bankFee, setBankFee] = useState("0");
  const [internalNotes, setInternalNotes] = useState("");

  const [payMethods, setPayMethods] = useState({
    cash: true,
    transfer: false,
    homeCredit: false,
    miraeAsset: false,
    debt: false,
  });

  const [payAmounts, setPayAmounts] = useState({
    cash: "",
    transfer: "",
    homeCredit: "",
    miraeAsset: "",
    debt: "",
  });

  // Calculate refund values dynamically
  const activeCards = cards.filter((c) => c.currentBalance > 0);
  const activeTreatments = treatments.filter((t) => t.totalSessions - t.usedSessions > 0);

  const getCardRefundValue = (card: CustomerCardProp) => {
    // Formula: Max(0, originalPrice - (originalValue - currentBalance))
    const spentValue = card.originalValue - card.currentBalance;
    return Math.max(0, card.originalPrice - spentValue);
  };

  const getTreatmentRefundValue = (treatment: CustomerTreatmentProp) => {
    // Formula: Max(0, pricePaid - (usedSessions * retailPrice))
    const retailPrice = services.find((s) => s.id === treatment.service.id)?.price || 0;
    return Math.max(0, treatment.pricePaid - treatment.usedSessions * retailPrice);
  };

  // Total conversion credit calculated from selections
  const totalRevokeValue =
    activeCards.reduce((sum, c) => (selectedCards[c.id] ? sum + getCardRefundValue(c) : sum), 0) +
    activeTreatments.reduce((sum, t) => (selectedTreatments[t.id] ? sum + getTreatmentRefundValue(t) : sum), 0);

  // New Invoice totals
  const totalAmount = selectedItems.reduce((sum, item) => {
    const itemDisc = Number(parseMoneyInput(item.discount || "0")) || 0;
    return sum + (item.price * item.quantity - itemDisc);
  }, 0);

  const finalAmount = Math.max(0, totalAmount - (Number(parseMoneyInput(discount)) || 0));

  // Offset applied
  const paidAmountOffset = Math.min(totalRevokeValue, finalAmount);

  // Remainder to pay
  const remainderToPay = Math.max(0, finalAmount - paidAmountOffset);

  // Update payments remainder allocation automatically
  useEffect(() => {
    // Remainder calculation logic similar to CreateInvoiceForm
    const activeMethods = Object.entries(payMethods)
      .filter(([_, checked]) => checked)
      .map(([method]) => method);

    if (activeMethods.length === 0) return;

    // Pick the first method as the automatic remainder filler (typically Cash)
    const remainderMethod = activeMethods[0] as keyof typeof payAmounts;
    
    // Sum other inputs
    let otherSum = 0;
    activeMethods.forEach((method) => {
      if (method !== remainderMethod) {
        otherSum += Number(parseMoneyInput(payAmounts[method as keyof typeof payAmounts] || "0")) || 0;
      }
    });

    const autofillValue = Math.max(0, remainderToPay - otherSum);
    setPayAmounts((prev) => ({
      ...prev,
      [remainderMethod]: autofillValue > 0 ? autofillValue.toLocaleString("vi-VN") : "",
    }));
  }, [remainderToPay, payMethods, payAmounts.cash, payAmounts.transfer, payAmounts.homeCredit, payAmounts.miraeAsset, payAmounts.debt]);

  // Pre-populate defaults on open
  const handleOpen = () => {
    setError("");
    setSelectedCards({});
    setSelectedTreatments({});
    setSelectedItems([]);
    setDiscount("0");
    setBankFee("0");
    setInternalNotes("");
    setPayMethods({
      cash: true,
      transfer: false,
      homeCredit: false,
      miraeAsset: false,
      debt: false,
    });
    setPayAmounts({
      cash: remainderToPay.toLocaleString("vi-VN"),
      transfer: "",
      homeCredit: "",
      miraeAsset: "",
      debt: "",
    });
    if (staffMembers.length > 0) {
      setCashierId(staffMembers[0].id);
    }
    setIsOpen(true);
  };

  const handleAddItem = () => {
    setError("");
    if (!selectedItemId) return;

    let itemDetails: SelectedItem | null = null;

    if (selectedItemType === "service" || selectedItemType === "product") {
      const s = services.find((sv) => sv.id === selectedItemId);
      if (s) {
        itemDetails = {
          id: s.id,
          name: s.name,
          itemType: s.type as "service" | "product",
          price: s.price,
          quantity: 1,
          discount: "0",
          totalSessions: s.type === "service" ? 10 : undefined, // default sessions
          saleStaffIds: cashierId ? [cashierId] : [],
        };
      }
    } else if (selectedItemType === "card") {
      const c = cardTemplates.find((tc) => tc.id === selectedItemId);
      if (c) {
        itemDetails = {
          id: c.id,
          name: c.name,
          itemType: "card",
          price: c.price,
          quantity: 1,
          discount: "0",
          saleStaffIds: cashierId ? [cashierId] : [],
        };
      }
    }

    if (itemDetails) {
      const exists = selectedItems.find((itm) => itm.id === itemDetails!.id && itm.itemType === itemDetails!.itemType);
      if (exists) {
        setError("Mặt hàng này đã có trong danh sách chọn mua");
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
      setError("Vui lòng chọn nhân viên thu ngân");
      setLoading(false);
      return;
    }

    const revokeCardIds = Object.keys(selectedCards).filter((k) => selectedCards[k]);
    const revokeTreatmentIds = Object.keys(selectedTreatments).filter((k) => selectedTreatments[k]);

    if (revokeCardIds.length === 0 && revokeTreatmentIds.length === 0) {
      setError("Vui lòng chọn ít nhất một thẻ tài khoản hoặc gói liệu trình cũ để hủy");
      setLoading(false);
      return;
    }

    if (selectedItems.length === 0) {
      setError("Vui lòng chọn ít nhất một dịch vụ/mẫu thẻ mới để mua");
      setLoading(false);
      return;
    }

    if (finalAmount > totalRevokeValue) {
      setError("Chỉ được phép chuyển đổi sang dịch vụ mới có tổng giá trị bằng hoặc nhỏ hơn giá trị quy đổi của gói cũ.");
      setLoading(false);
      return;
    }

    // Verify sale staff assignment
    const missingStaff = selectedItems.find((itm) => !itm.saleStaffIds || itm.saleStaffIds.length === 0);
    if (missingStaff) {
      setError(`Vui lòng chọn ít nhất một nhân viên tư vấn cho "${missingStaff.name}"`);
      setLoading(false);
      return;
    }

    // Money validation
    const cashVal = Number(parseMoneyInput(payAmounts.cash || "0")) || 0;
    const transferVal = Number(parseMoneyInput(payAmounts.transfer || "0")) || 0;
    const hcVal = Number(parseMoneyInput(payAmounts.homeCredit || "0")) || 0;
    const maVal = Number(parseMoneyInput(payAmounts.miraeAsset || "0")) || 0;
    const debtVal = Number(parseMoneyInput(payAmounts.debt || "0")) || 0;

    const totalSplit = cashVal + transferVal + hcVal + maVal + debtVal;
    if (Math.abs(totalSplit - remainderToPay) > 1) {
      setError(`Tổng tiền thanh toán còn lại của các phương thức (${formatVND(totalSplit)}) phải bằng số tiền cần thanh toán (${formatVND(remainderToPay)})`);
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
          revokeCardIds,
          revokeTreatmentIds,
          totalAmount,
          discount: Number(parseMoneyInput(discount)),
          finalAmount,
          paidAmountOffset,
          paidAmountCash: cashVal,
          paidAmountTransfer: transferVal,
          paidAmountHomeCredit: hcVal,
          paidAmountMiraeAsset: maVal,
          paidAmountDebt: debtVal,
          installmentMonths: payMethods.debt ? Number(installmentMonths) : undefined,
          bankFee: Number(parseMoneyInput(bankFee)),
          internalNotes,
          performedBy: staffMembers.find((s) => s.id === cashierId)?.fullName || "Hệ thống",
          newItems: selectedItems.map((itm) => ({
            itemType: itm.itemType,
            itemId: itm.id,
            price: itm.price,
            quantity: itm.quantity,
            totalSessions: itm.itemType === "service" ? itm.totalSessions : undefined,
            discount: Number(parseMoneyInput(itm.discount || "0")) || 0,
            staffId: itm.saleStaffIds?.[0] ? itm.saleStaffIds[0].split(":")[0] : null,
            saleStaffIds: itm.saleStaffIds || [],
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Giao dịch chuyển đổi gói thất bại");

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = (() => {
    const q = itemSearch.toLowerCase();
    if (selectedItemType === "service" || selectedItemType === "product") {
      return services
        .filter((sv) => sv.type === selectedItemType)
        .filter((sv) => sv.name.toLowerCase().includes(q));
    }
    return cardTemplates.filter((tc) => tc.name.toLowerCase().includes(q));
  })();

  return (
    <>
      <button
        onClick={handleOpen}
        className={styles.createBtn}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          width: "100%",
          justifyContent: "center",
          padding: "0.85rem",
          background: "linear-gradient(135deg, #b8860b 0%, #d4af37 100%)",
        }}
      >
        <Activity size={18} />
        <span>Chuyển đổi gói/thẻ</span>
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modal}
            style={{
              maxWidth: "1000px",
              width: "95%",
              maxHeight: "92vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Chuyển đổi gói dịch vụ - Khách hàng: <span style={{ color: "var(--accent-gold)" }}>{customerName}</span>
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

            <form onSubmit={handleSubmit} className={styles.form} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Section 1: Select items to revoke */}
              <div
                style={{
                  background: "var(--bg-primary)",
                  padding: "1.25rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <h4 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "1rem", borderLeft: "3px solid var(--accent-gold)", paddingLeft: "0.5rem" }}>
                  BƯỚC 1: CHỌN GÓI/THẺ CŨ CẦN THU HỒI
                </h4>
                
                {activeCards.length === 0 && activeTreatments.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Khách hàng không sở hữu thẻ tài khoản hoặc gói liệu trình hoạt động nào.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {activeCards.length > 0 && (
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>Thẻ Tài Khoản:</strong>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
                          {activeCards.map((c) => {
                            const refundVal = getCardRefundValue(c);
                            return (
                              <label
                                key={c.id}
                                style={{
                                  display: "flex",
                                  gap: "0.75rem",
                                  alignItems: "flex-start",
                                  background: "var(--bg-secondary)",
                                  padding: "0.85rem",
                                  borderRadius: "6px",
                                  border: `1px solid ${selectedCards[c.id] ? "var(--accent-gold)" : "var(--border-color)"}`,
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selectedCards[c.id]}
                                  onChange={(e) => setSelectedCards({ ...selectedCards, [c.id]: e.target.checked })}
                                  style={{ marginTop: "0.2rem" }}
                                />
                                <div style={{ fontSize: "0.85rem" }}>
                                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{c.name}</div>
                                  <div style={{ color: "var(--text-secondary)" }}>Số dư: {formatVND(c.currentBalance)}</div>
                                  <div style={{ color: "var(--text-secondary)" }}>Đã nạp mua: {formatVND(c.originalPrice)}</div>
                                  <div style={{ color: "var(--accent-gold)", fontWeight: 700, marginTop: "0.25rem" }}>Quy đổi hoàn trả: {formatVND(refundVal)}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeTreatments.length > 0 && (
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>Gói Liệu Trình:</strong>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
                          {activeTreatments.map((t) => {
                            const refundVal = getTreatmentRefundValue(t);
                            const remaining = t.totalSessions - t.usedSessions;
                            return (
                              <label
                                key={t.id}
                                style={{
                                  display: "flex",
                                  gap: "0.75rem",
                                  alignItems: "flex-start",
                                  background: "var(--bg-secondary)",
                                  padding: "0.85rem",
                                  borderRadius: "6px",
                                  border: `1px solid ${selectedTreatments[t.id] ? "var(--accent-gold)" : "var(--border-color)"}`,
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selectedTreatments[t.id]}
                                  onChange={(e) => setSelectedTreatments({ ...selectedTreatments, [t.id]: e.target.checked })}
                                  style={{ marginTop: "0.2rem" }}
                                />
                                <div style={{ fontSize: "0.85rem" }}>
                                  <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{t.service.name}</div>
                                  <div style={{ color: "var(--text-secondary)" }}>Còn: {remaining}/{t.totalSessions} buổi</div>
                                  <div style={{ color: "var(--text-secondary)" }}>Giá mua: {formatVND(t.pricePaid)}</div>
                                  <div style={{ color: "var(--accent-gold)", fontWeight: 700, marginTop: "0.25rem" }}>Quy đổi hoàn trả: {formatVND(refundVal)}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(197, 160, 89, 0.08)", borderRadius: "6px", textAlign: "right" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", marginRight: "0.5rem" }}>Tổng số tiền được quy đổi:</span>
                  <strong style={{ fontSize: "1.2rem", color: "var(--accent-gold)" }}>{formatVND(totalRevokeValue)}</strong>
                </div>
              </div>

              {/* Section 2: Choose new items to buy */}
              <div
                style={{
                  background: "var(--bg-primary)",
                  padding: "1.25rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <h4 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "1rem", borderLeft: "3px solid var(--accent-gold)", paddingLeft: "0.5rem" }}>
                  BƯỚC 2: CHỌN DỊCH VỤ / SẢN PHẨM / THẺ NẠP MỚI ĐỂ MUA
                </h4>

                {/* Items selection tool */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <select
                      className={styles.searchInput}
                      value={selectedItemType}
                      onChange={(e) => {
                        setSelectedItemType(e.target.value as any);
                        setSelectedItemId("");
                        setItemSearch("");
                      }}
                      style={{ padding: "0.5rem", fontSize: "0.85rem", width: "120px" }}
                    >
                      <option value="service">Dịch vụ</option>
                      <option value="product">Sản phẩm</option>
                      <option value="card">Thẻ nạp</option>
                    </select>
                  </div>

                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder={`Tìm kiếm tên ${selectedItemType === "service" ? "dịch vụ" : selectedItemType === "product" ? "sản phẩm" : "mẫu thẻ nạp"}...`}
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value);
                        setShowItemSuggestions(true);
                      }}
                      onFocus={() => setShowItemSuggestions(true)}
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
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
                          maxHeight: "200px",
                          overflowY: "auto",
                          zIndex: 200,
                          boxShadow: "var(--shadow-md)",
                        }}
                      >
                        {filteredItems.length === 0 ? (
                          <div style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Không có kết quả tìm kiếm</div>
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
                                padding: "0.5rem 1rem",
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
                      padding: "0.5rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                {/* Selected purchase list */}
                {selectedItems.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center", padding: "1.5rem 0" }}>Chưa chọn mặt hàng mới nào để mua.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className={styles.table} style={{ fontSize: "0.85rem" }}>
                      <thead>
                        <tr>
                          <th className={styles.th}>Tên mặt hàng</th>
                          <th className={styles.th}>Đơn giá</th>
                          <th className={styles.th} style={{ width: "80px" }}>SL</th>
                          {selectedItemType === "service" && <th className={styles.th} style={{ width: "90px" }}>Số buổi</th>}
                          <th className={styles.th} style={{ width: "130px" }}>Chiết khấu</th>
                          <th className={styles.th}>Sale tư vấn (Chọn nhiều)</th>
                          <th className={styles.th} style={{ width: "50px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item, idx) => (
                          <tr key={`${item.id}-${idx}`} className={styles.tr}>
                            <td className={styles.td} style={{ fontWeight: 600 }}>{item.name}</td>
                            <td className={styles.td}>{formatVND(item.price)}</td>
                            <td className={styles.td}>
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
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                              />
                            </td>
                            {selectedItemType === "service" && (
                              <td className={styles.td}>
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
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                                  />
                                ) : "-"}
                              </td>
                            )}
                            <td className={styles.td}>
                              <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="0"
                                value={item.discount}
                                onChange={(e) => {
                                  setSelectedItems(
                                    selectedItems.map((itm) =>
                                      itm.id === item.id && itm.itemType === item.itemType ? { ...itm, discount: formatMoneyInput(e.target.value) } : itm
                                    )
                                  );
                                }}
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                              />
                            </td>
                            <td className={styles.td}>
                              {/* Multiple sale checkboxes */}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", maxHeight: "80px", overflowY: "auto", border: "1px solid var(--border-color)", padding: "0.35rem", borderRadius: "4px" }}>
                                {staffMembers.map((st) => {
                                  const isChecked = (item.saleStaffIds || []).some(id => id === st.id || id.startsWith(st.id + ":"));
                                  return (
                                    <label key={st.id} style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                      background: isChecked ? "rgba(212, 175, 55, 0.1)" : "var(--bg-secondary)",
                                      padding: "0.15rem 0.4rem",
                                      borderRadius: "3px",
                                      fontSize: "0.75rem",
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
                                        style={{ accentColor: "var(--accent-gold)", cursor: "pointer" }}
                                      />
                                      <span>{st.fullName}</span>
                                      {isChecked && (
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          placeholder="%"
                                          value={(() => {
                                            const match = item.saleStaffIds?.find(id => id.startsWith(st.id + ":"));
                                            return match ? match.split(":")[1] || "" : "";
                                          })()}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            let newIds = (item.saleStaffIds || []).filter(id => id !== st.id && !id.startsWith(st.id + ":"));
                                            if (val === "") {
                                              newIds.push(st.id);
                                            } else {
                                              newIds.push(`${st.id}:${val}`);
                                            }
                                            handleItemStaffsChange(item.id, item.itemType, newIds);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            width: "42px",
                                            marginLeft: "2px",
                                            padding: "2px 0",
                                            fontSize: "0.72rem",
                                            borderRadius: "3px",
                                            border: "1px solid var(--border-color)",
                                            background: "var(--bg-secondary)",
                                            color: "var(--text-primary)",
                                            textAlign: "center"
                                          }}
                                        />
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            </td>
                            <td className={styles.td}>
                              <Trash2
                                size={16}
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

              {/* Section 3: Calculations & Payments */}
              <div
                style={{
                  background: "var(--bg-primary)",
                  padding: "1.25rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1.2fr",
                  gap: "1.5rem",
                }}
              >
                {/* Financial Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <h4 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.5rem", borderLeft: "3px solid var(--accent-gold)", paddingLeft: "0.5rem" }}>
                    TÍNH TOÁN HÓA ĐƠN
                  </h4>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>Tổng cộng đơn mới:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{formatVND(totalAmount)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.9rem" }}>Chiết khấu hóa đơn:</span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      value={discount}
                      onChange={(e) => setDiscount(formatMoneyInput(e.target.value))}
                      style={{ width: "150px", textAlign: "right", padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", borderTop: "1px dashed var(--border-color)", paddingTop: "0.5rem" }}>
                    <span>Thanh toán đơn mới (sau CK):</span>
                    <strong style={{ color: "var(--text-primary)" }}>{formatVND(finalAmount)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--accent-rose)" }}>
                    <span>Khấu trừ cấn trừ quy đổi:</span>
                    <strong>-{formatVND(paidAmountOffset)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.5rem", color: "var(--accent-gold)" }}>
                    <span>Còn lại cần thanh toán:</span>
                    <strong style={{ fontSize: "1.2rem" }}>{formatVND(remainderToPay)}</strong>
                  </div>
                  
                  {remainderToPay > 0 && (
                    <div style={{ color: "#dc3545", background: "rgba(220, 53, 69, 0.05)", padding: "0.5rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem", marginTop: "0.5rem", fontWeight: 600, border: "1px solid rgba(220, 53, 69, 0.15)" }}>
                      ⚠️ Giá trị dịch vụ mới lớn hơn gói cũ. Chỉ được đổi bằng hoặc nhỏ hơn.
                    </div>
                  )}
                </div>

                {/* Remaining Amount Payment Methods */}
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.5rem", borderLeft: "3px solid var(--accent-gold)", paddingLeft: "0.5rem" }}>
                    THANH TOÁN PHẦN CÒN LẠI
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                      {Object.keys(payMethods).map((method) => {
                        const mLabel =
                          method === "cash"
                            ? "Tiền mặt"
                            : method === "transfer"
                            ? "Chuyển khoản"
                            : method === "homeCredit"
                            ? "Home Credit"
                            : method === "miraeAsset"
                            ? "Mirae Asset"
                            : "Nợ tại quầy (Spa)";
                        return (
                          <label key={method} style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", fontWeight: 600 }}>
                            <input
                              type="checkbox"
                              checked={payMethods[method as keyof typeof payMethods]}
                              onChange={(e) => setPayMethods({ ...payMethods, [method]: e.target.checked })}
                            />
                            {mLabel}
                          </label>
                        );
                      })}
                    </div>

                    {/* Method amount input fields */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      {payMethods.cash && (
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.8rem" }}>Tiền mặt</label>
                          <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="0"
                            value={payAmounts.cash}
                            onChange={(e) => setPayAmounts({ ...payAmounts, cash: formatMoneyInput(e.target.value) })}
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </div>
                      )}
                      
                      {payMethods.transfer && (
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.8rem" }}>Chuyển khoản</label>
                          <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="0"
                            value={payAmounts.transfer}
                            onChange={(e) => setPayAmounts({ ...payAmounts, transfer: formatMoneyInput(e.target.value) })}
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </div>
                      )}

                      {payMethods.homeCredit && (
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.8rem" }}>Home Credit</label>
                          <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="0"
                            value={payAmounts.homeCredit}
                            onChange={(e) => setPayAmounts({ ...payAmounts, homeCredit: formatMoneyInput(e.target.value) })}
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </div>
                      )}

                      {payMethods.miraeAsset && (
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.8rem" }}>Mirae Asset</label>
                          <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="0"
                            value={payAmounts.miraeAsset}
                            onChange={(e) => setPayAmounts({ ...payAmounts, miraeAsset: formatMoneyInput(e.target.value) })}
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </div>
                      )}

                      {payMethods.debt && (
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.8rem" }}>Nợ tại quầy</label>
                          <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="0"
                            value={payAmounts.debt}
                            onChange={(e) => setPayAmounts({ ...payAmounts, debt: formatMoneyInput(e.target.value) })}
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Installment months selector if Debt is selected */}
                    {payMethods.debt && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.8rem" }}>Kỳ hạn trả góp nợ (Tháng)</label>
                          <select
                            className={styles.searchInput}
                            value={installmentMonths}
                            onChange={(e) => setInstallmentMonths(e.target.value)}
                            style={{ padding: "0.35rem", fontSize: "0.85rem", appearance: "auto" }}
                          >
                            <option value="1">1 tháng</option>
                            <option value="3">3 tháng</option>
                            <option value="6">6 tháng</option>
                            <option value="9">9 tháng</option>
                            <option value="12">12 tháng</option>
                          </select>
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label} style={{ fontSize: "0.8rem" }}>Phí ngân hàng (Nợ / Giao dịch)</label>
                          <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="0"
                            value={bankFee}
                            onChange={(e) => setBankFee(formatMoneyInput(e.target.value))}
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cashier & Notes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nhân viên thu ngân lập GD *</label>
                  <select
                    className={styles.searchInput}
                    value={cashierId}
                    onChange={(e) => setCashierId(e.target.value)}
                    required
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
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ghi chú nội bộ</label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Lý do chuyển đổi..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setIsOpen(false)} className={styles.cancelBtn} disabled={loading}>
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className={styles.createBtn} 
                  disabled={loading || remainderToPay > 0} 
                  style={{ 
                    background: remainderToPay > 0 ? "var(--border-color)" : "var(--grad-premium)", 
                    cursor: remainderToPay > 0 ? "not-allowed" : "pointer" 
                  }}
                >
                  {loading ? "Đang xử lý..." : "Xác nhận chuyển đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
