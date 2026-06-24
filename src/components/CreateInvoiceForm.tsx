"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/sales/page.module.css";
import { Receipt, Plus, Trash2, X } from "lucide-react";

const formatMoneyInput = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseMoneyInput = (val: string) => {
  return val.replace(/\./g, "");
};

interface CustomerProp {
  id: string;
  fullName: string;
  phone: string;
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

interface CreateInvoiceFormProps {
  customers: CustomerProp[];
  services: ServiceProp[];
  cardTemplates: CardTemplateProp[];
  staff: StaffProp[];
  initialCustomerId?: string;
  appointmentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface SelectedItem {
  id: string;
  name: string;
  itemType: "service" | "card" | "product";
  price: number;
  quantity: number;
  totalSessions?: number; // for services
  discount: string; // money discount for this specific item line
  staffId: string; // technician/sale assigned to this item
}

export default function CreateInvoiceForm({
  customers,
  services,
  cardTemplates,
  staff,
  initialCustomerId,
  appointmentId,
  onSuccess,
  onCancel,
}: CreateInvoiceFormProps) {
  const router = useRouter();

  // State fields
  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [staffId, setStaffId] = useState(""); // Cashier staff
  const [discount, setDiscount] = useState("0"); // Invoice level overall discount
  const [paymentType, setPaymentType] = useState<"cash" | "installment">("cash");
  const [installmentMonths, setInstallmentMonths] = useState("1");
  const [installmentType, setInstallmentType] = useState<string>("counter");
  const [downPayment, setDownPayment] = useState("0");
  const [bankFee, setBankFee] = useState("0");
  const [internalNotes, setInternalNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDownPaymentManuallyEdited, setIsDownPaymentManuallyEdited] = useState(false);

  // Selector fields
  const [selectedItemType, setSelectedItemType] = useState<"service" | "product" | "card">("service");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  // Derived calculation fields
  const [totalAmount, setTotalAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [previewInstallments, setPreviewInstallments] = useState<{ month: number; amount: number }[]>([]);

  // Pre-fill customerId if prop changes
  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  // Pre-fill customerSearch text when customerId changes
  useEffect(() => {
    if (customerId) {
      const selected = customers.find((c) => c.id === customerId);
      if (selected) {
        setCustomerSearch(`${selected.fullName} (${selected.phone})`);
      }
    } else {
      setCustomerSearch("");
    }
  }, [customerId, customers]);

  const filteredInvoiceCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const filteredItems = (() => {
    const q = itemSearch.toLowerCase();
    if (selectedItemType === "service") {
      return services
        .filter((sv) => sv.type === "service")
        .filter((sv) => sv.name.toLowerCase().includes(q));
    } else if (selectedItemType === "product") {
      return services
        .filter((sv) => sv.type === "product")
        .filter((sv) => sv.name.toLowerCase().includes(q));
    } else {
      return cardTemplates.filter((tc) => tc.name.toLowerCase().includes(q));
    }
  })();

  // Update calculations when items, overall discount, or payment details change
  useEffect(() => {
    // Total price before any discounts
    const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Sum of all item-level discounts
    const itemDiscountsSum = selectedItems.reduce((sum, item) => {
      return sum + (Number(parseMoneyInput(item.discount || "0")) || 0);
    }, 0);

    const overallDisc = Number(parseMoneyInput(discount)) || 0;
    const final = Math.max(total - itemDiscountsSum - overallDisc, 0);
    
    setTotalAmount(total);
    setFinalAmount(final);

    // Auto-update downPayment if the user hasn't edited it manually
    let currentDown = final;
    if (isDownPaymentManuallyEdited) {
      currentDown = Number(parseMoneyInput(downPayment)) || 0;
      // Clamp down payment to final amount
      if (currentDown > final) {
        currentDown = final;
        setDownPayment(formatMoneyInput(final.toString()));
      }
    } else {
      setDownPayment(formatMoneyInput(final.toString()));
    }

    const debt = Math.max(final - currentDown, 0);
    
    if (debt > 0) {
      setPaymentType("installment");
      const months = Number(installmentMonths);
      const baseAmt = Math.floor(debt / months);
      const list: { month: number; amount: number }[] = [];
      let sumCreated = 0;

      for (let i = 1; i <= months; i++) {
        if (i === months) {
          list.push({ month: i, amount: debt - sumCreated });
        } else {
          list.push({ month: i, amount: baseAmt });
          sumCreated += baseAmt;
        }
      }
      setPreviewInstallments(list);
    } else {
      setPaymentType("cash");
      setPreviewInstallments([]);
    }
  }, [selectedItems, discount, installmentMonths, downPayment, isDownPaymentManuallyEdited]);

  const handleAddItem = () => {
    if (!selectedItemId) return;
    
    // Find item details
    let itemDetails: SelectedItem | undefined;
    if (selectedItemType === "service") {
      const s = services.find((sv) => sv.id === selectedItemId && sv.type === "service");
      if (s) {
        itemDetails = {
          id: s.id,
          name: s.name,
          itemType: "service",
          price: s.price,
          quantity: 1,
          totalSessions: 1, // Default 1 session
          discount: "0",
          staffId: staffId || "",
        };
      }
    } else if (selectedItemType === "product") {
      const s = services.find((sv) => sv.id === selectedItemId && sv.type === "product");
      if (s) {
        itemDetails = {
          id: s.id,
          name: s.name,
          itemType: "product",
          price: s.price,
          quantity: 1,
          discount: "0",
          staffId: staffId || "",
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
          staffId: staffId || "",
        };
      }
    }

    if (itemDetails) {
      // Avoid duplicates
      const exists = selectedItems.find((itm) => itm.id === itemDetails!.id && itm.itemType === itemDetails!.itemType);
      if (exists) {
        setError("Món hàng này đã có trong danh sách chọn");
        return;
      }
      setSelectedItems([...selectedItems, itemDetails]);
      setSelectedItemId("");
      setItemSearch("");
      setError("");
    }
  };

  const handleRemoveItem = (id: string, type: string) => {
    setSelectedItems(selectedItems.filter((item) => !(item.id === id && item.itemType === type)));
  };

  const handleQtyChange = (id: string, type: string, qty: number) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === id && item.itemType === type ? { ...item, quantity: Math.max(qty, 1) } : item
      )
    );
  };

  const handleSessionsChange = (id: string, sessions: number) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === id && item.itemType === "service" ? { ...item, totalSessions: Math.max(sessions, 1) } : item
      )
    );
  };

  // Handle custom discount per item
  const handleItemDiscountChange = (id: string, type: string, disc: string) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === id && item.itemType === type ? { ...item, discount: formatMoneyInput(disc) } : item
      )
    );
  };

  // Handle staff assignment per item
  const handleItemStaffChange = (id: string, type: string, selectedStaffId: string) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === id && item.itemType === type ? { ...item, staffId: selectedStaffId } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!customerId) {
      setError("Vui lòng chọn khách hàng");
      setLoading(false);
      return;
    }
    if (!staffId) {
      setError("Vui lòng chọn nhân viên thu ngân");
      setLoading(false);
      return;
    }
    if (selectedItems.length === 0) {
      setError("Hóa đơn phải có ít nhất 1 dịch vụ hoặc thẻ nạp");
      setLoading(false);
      return;
    }

    // Verify all selected items have a staff assigned
    const missingStaff = selectedItems.find((itm) => !itm.staffId);
    if (missingStaff) {
      setError(`Vui lòng chọn nhân viên chịu trách nhiệm/sale cho món hàng "${missingStaff.name}"`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          staffId,
          totalAmount,
          discount: Number(parseMoneyInput(discount)),
          finalAmount,
          paymentType,
          installmentType: paymentType === "installment" ? installmentType : undefined,
          installmentMonths: paymentType === "installment" ? Number(installmentMonths) : undefined,
          downPayment: paymentType === "installment" ? Number(parseMoneyInput(downPayment)) : 0,
          bankFee: paymentType === "installment" ? Number(parseMoneyInput(bankFee)) : 0,
          internalNotes,
          items: selectedItems.map((itm) => ({
            itemType: itm.itemType,
            itemId: itm.id,
            price: itm.price,
            quantity: itm.quantity,
            totalSessions: itm.itemType === "service" ? itm.totalSessions : undefined,
            discount: Number(parseMoneyInput(itm.discount || "0")) || 0,
            staffId: itm.staffId,
          })),
          appointmentId: appointmentId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Tạo hóa đơn thất bại");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/staff/customers/${customerId}`);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.card} style={{ border: "none", padding: 0, boxShadow: "none", background: "transparent" }}>
      {error && (
        <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "1rem", borderRadius: "4px", fontSize: "0.95rem", fontWeight: "600", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* 1. Customer & Cashier selection */}
      <div className={styles.sectionTitle}>Thông tin khách hàng & Bán hàng</div>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Khách Hàng *</label>
          {initialCustomerId ? (
            <input
              type="text"
              className={styles.input}
              value={customerSearch}
              disabled
            />
          ) : (
            <div className={styles.searchDropdownContainer}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nhập tên hoặc số điện thoại để tìm..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerId(""); // clear selected id
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                  required
                  disabled={loading}
                  style={{ paddingRight: "30px" }}
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch("");
                      setCustomerId("");
                    }}
                    className={styles.inputClearBtn}
                    title="Xóa lựa chọn"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {showCustomerSuggestions && (
                <div className={styles.suggestionsList}>
                  {filteredInvoiceCustomers.length === 0 ? (
                    <div className={styles.suggestionEmpty}>
                      Không tìm thấy khách hàng nào phù hợp
                    </div>
                  ) : (
                    filteredInvoiceCustomers.map((c) => (
                      <div
                        key={c.id}
                        className={styles.suggestionItem}
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent input blur before state change
                          setCustomerId(c.id);
                          setCustomerSearch(`${c.fullName} (${c.phone})`);
                          setShowCustomerSuggestions(false);
                        }}
                      >
                        <span className={styles.suggestionName}>{c.fullName}</span>
                        <span className={styles.suggestionPhone}>{c.phone}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <input type="hidden" value={customerId} required name="customerId" />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Thu ngân / Người lập hóa đơn *</label>
          <select
            className={styles.select}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">-- Chọn nhân viên thu ngân --</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Item selector box */}
      <div className={styles.sectionTitle}>Chọn Dịch vụ, Sản phẩm & Thẻ nạp</div>
      <div className={styles.itemSelectionBox}>
        {/* Tab Selection Bar */}
        <div className={styles.tabContainer}>
          <button
            type="button"
            className={`${styles.tabBtn} ${selectedItemType === "service" ? styles.tabActive : ""}`}
            onClick={() => {
              setSelectedItemType("service");
              setSelectedItemId("");
              setItemSearch("");
              setShowItemSuggestions(false);
            }}
            disabled={loading}
          >
            Dịch vụ
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${selectedItemType === "product" ? styles.tabActive : ""}`}
            onClick={() => {
              setSelectedItemType("product");
              setSelectedItemId("");
              setItemSearch("");
              setShowItemSuggestions(false);
            }}
            disabled={loading}
          >
            Sản phẩm
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${selectedItemType === "card" ? styles.tabActive : ""}`}
            onClick={() => {
              setSelectedItemType("card");
              setSelectedItemId("");
              setItemSearch("");
              setShowItemSuggestions(false);
            }}
            disabled={loading}
          >
            Thẻ thành viên
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tìm kiếm nhanh mặt hàng</label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.input}
                placeholder={`Nhập tên để tìm kiếm nhanh ${
                  selectedItemType === "service"
                    ? "dịch vụ"
                    : selectedItemType === "product"
                    ? "sản phẩm"
                    : "thẻ thành viên"
                }...`}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                disabled={loading}
              />
              {itemSearch && (
                <button
                  type="button"
                  onClick={() => setItemSearch("")}
                  className={styles.inputClearBtn}
                  title="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className={styles.checkboxItemsContainer}>
            {filteredItems.length === 0 ? (
              <div className={styles.suggestionEmpty} style={{ gridColumn: "span 3", padding: "1rem" }}>
                Không tìm thấy mặt hàng nào phù hợp
              </div>
            ) : (
              filteredItems.map((item) => {
                const isChecked = selectedItems.some(
                  (itm) => itm.id === item.id && itm.itemType === selectedItemType
                );
                return (
                  <label key={item.id} className={styles.checkboxItemLabel}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          let newItem: SelectedItem;
                          if (selectedItemType === "service") {
                            newItem = {
                              id: item.id,
                              name: item.name,
                              itemType: "service",
                              price: item.price,
                              quantity: 1,
                              totalSessions: 1,
                              discount: "0",
                              staffId: staffId || "",
                            };
                          } else if (selectedItemType === "product") {
                            newItem = {
                              id: item.id,
                              name: item.name,
                              itemType: "product",
                              price: item.price,
                              quantity: 1,
                              discount: "0",
                              staffId: staffId || "",
                            };
                          } else {
                            newItem = {
                              id: item.id,
                              name: item.name,
                              itemType: "card",
                              price: item.price,
                              quantity: 1,
                              discount: "0",
                              staffId: staffId || "",
                            };
                          }
                          setSelectedItems([...selectedItems, newItem]);
                        } else {
                          setSelectedItems(
                            selectedItems.filter(
                              (itm) => !(itm.id === item.id && itm.itemType === selectedItemType)
                            )
                          );
                        }
                      }}
                      disabled={loading}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                    <span className={styles.checkboxItemText}>
                      <strong>{item.name}</strong>
                      <span className={styles.checkboxItemPrice}>
                        {selectedItemType === "card"
                          ? `Bán: ${item.price.toLocaleString("vi-VN")}đ | Nhận: ${(item as any).value.toLocaleString("vi-VN")}đ`
                          : `${item.price.toLocaleString("vi-VN")}đ`}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Items List */}
        <div className={styles.selectedItemsList}>
          {selectedItems.length === 0 ? (
            <div className={styles.emptyText} style={{ padding: "1.5rem" }}>Chưa có mặt hàng nào được chọn.</div>
          ) : (
            selectedItems.map((item) => {
              const itemDiscountVal = Number(parseMoneyInput(item.discount || "0")) || 0;
              const itemSubtotal = Math.max((item.price * item.quantity) - itemDiscountVal, 0);
              return (
                <div key={`${item.id}-${item.itemType}`} className={styles.selectedItemRow}>
                  <div className={styles.itemDetails} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span className={styles.itemName} style={{ fontWeight: 700, fontSize: "0.95rem" }}>{item.name}</span>
                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      <span>Đơn giá: <strong>{item.price.toLocaleString("vi-VN")}đ</strong></span>
                      <span>Số lượng: <strong>{item.quantity}</strong></span>
                      {itemDiscountVal > 0 && <span style={{ color: "#dc3545" }}>Giảm: <strong>-{itemDiscountVal.toLocaleString("vi-VN")}đ</strong></span>}
                    </div>
                    <div style={{ fontSize: "0.88rem", marginTop: "0.15rem" }}>
                      Thành tiền: <strong style={{ color: "var(--accent-gold)", fontWeight: 800 }}>{itemSubtotal.toLocaleString("vi-VN")}đ</strong>
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    {item.itemType === "service" && (
                      <div className={`${styles.formGroup} ${styles.itemActionRow} ${styles.widthSessions}`}>
                        <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>Số buổi:</label>
                        <input
                          type="number"
                          className={`${styles.input} ${styles.actionInput} ${styles.actionInputCenter}`}
                          value={item.totalSessions || 1}
                          onChange={(e) => handleSessionsChange(item.id, Number(e.target.value))}
                          min="1"
                          disabled={loading}
                        />
                      </div>
                    )}

                    <div className={`${styles.formGroup} ${styles.itemActionRow} ${styles.widthQty}`}>
                      <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>SL:</label>
                      <input
                        type="number"
                        className={`${styles.input} ${styles.actionInput} ${styles.actionInputCenter}`}
                        value={item.quantity}
                        onChange={(e) => handleQtyChange(item.id, item.itemType, Number(e.target.value))}
                        min="1"
                        disabled={loading}
                      />
                    </div>

                    {/* CUSTOM DISCOUNT PER ITEM */}
                    <div className={`${styles.formGroup} ${styles.itemActionRow} ${styles.widthDiscount}`}>
                      <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>Giảm:</label>
                      <input
                        type="text"
                        className={`${styles.input} ${styles.actionInput}`}
                        placeholder="0"
                        value={item.discount}
                        onChange={(e) => handleItemDiscountChange(item.id, item.itemType, e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    {/* STAFF / SALE SELECTION PER ITEM */}
                    <div className={`${styles.formGroup} ${styles.itemActionRow} ${styles.widthStaff}`}>
                      <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>Sale/NV:</label>
                      <select
                        className={`${styles.select} ${styles.actionInput}`}
                        value={item.staffId}
                        onChange={(e) => handleItemStaffChange(item.id, item.itemType, e.target.value)}
                        disabled={loading}
                        required
                      >
                        <option value="">-- Chọn --</option>
                        {staff.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Trash2
                      size={16}
                      className={styles.removeItemBtn}
                      onClick={() => handleRemoveItem(item.id, item.itemType)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Invoicing configuration & payments options */}
      <div className={styles.sectionTitle}>Hình thức thanh toán</div>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Chiết khấu hóa đơn chung (đ)</label>
          <input
            type="text"
            className={styles.input}
            placeholder="0"
            value={discount}
            onChange={(e) => setDiscount(formatMoneyInput(e.target.value))}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Thanh toán ngay (đ) *</label>
          <input
            type="text"
            className={styles.input}
            placeholder="0"
            value={downPayment}
            onChange={(e) => {
              setDownPayment(formatMoneyInput(e.target.value));
              setIsDownPaymentManuallyEdited(true);
            }}
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Còn lại (Công nợ chuyển thu sau)</label>
          <div style={{
            padding: "0.55rem 0.75rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontWeight: 700,
            color: (finalAmount - (Number(parseMoneyInput(downPayment)) || 0)) > 0 ? "var(--accent-rose)" : "var(--text-primary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "38px"
          }}>
            <span>{Math.max(finalAmount - (Number(parseMoneyInput(downPayment)) || 0), 0).toLocaleString("vi-VN")}đ</span>
            {(finalAmount - (Number(parseMoneyInput(downPayment)) || 0)) > 0 && (
              <span style={{
                fontSize: "0.7rem",
                background: "rgba(220, 53, 69, 0.12)",
                color: "var(--accent-rose)",
                padding: "0.15rem 0.4rem",
                borderRadius: "4px",
                fontWeight: 600
              }}>Ghi nhận công nợ</span>
            )}
          </div>
        </div>

        {(finalAmount - (Number(parseMoneyInput(downPayment)) || 0)) > 0 && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>Hình thức ghi nợ / Trả góp</label>
              <select
                className={styles.select}
                value={installmentType}
                onChange={(e) => setInstallmentType(e.target.value)}
                disabled={loading}
              >
                <option value="counter">Ghi nợ tại Spa (Thu nợ sau)</option>
                <option value="home_credit">Home Credit</option>
                <option value="mirae_asset">Mirae Asset</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Kỳ hạn thanh toán nợ</label>
              <select
                className={styles.select}
                value={installmentMonths}
                onChange={(e) => setInstallmentMonths(e.target.value)}
                disabled={loading}
              >
                <option value="1">Trả hết 1 lần (sau 30 ngày)</option>
                <option value="3">Chia đều 3 tháng</option>
                <option value="6">Chia đều 6 tháng</option>
                <option value="9">Chia đều 9 tháng</option>
                <option value="12">Chia đều 12 tháng</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Phí phát sinh / Phí ngân hàng (đ)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="0"
                value={bankFee}
                onChange={(e) => setBankFee(formatMoneyInput(e.target.value))}
                disabled={loading}
              />
            </div>
          </>
        )}

        <div className={`${styles.formGroup} ${styles.formFull}`}>
          <label className={styles.label}>Ghi chú nội bộ</label>
          <textarea
            className={styles.textarea}
            placeholder="Ví dụ: Khách thanh toán chuyển khoản qua QR Techcombank..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            disabled={loading}
            style={{ minHeight: "60px" }}
          />
        </div>
      </div>

      {/* 4. Financial Summary */}
      <div className={styles.summarySection}>
        <div className={styles.summaryRow}>
          <span>Cộng giá gốc:</span>
          <span>{totalAmount.toLocaleString("vi-VN")}đ</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Giảm giá mặt hàng:</span>
          <span style={{ color: "#dc3545" }}>
            -{selectedItems.reduce((sum, itm) => sum + (Number(parseMoneyInput(itm.discount)) || 0), 0).toLocaleString("vi-VN")}đ
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span>Chiết khấu chung:</span>
          <span style={{ color: "#dc3545" }}>-{Number(parseMoneyInput(discount) || 0).toLocaleString("vi-VN")}đ</span>
        </div>
        <div className={`${styles.summaryRow} ${styles.totalRow}`}>
          <span>Tổng thanh toán:</span>
          <span>{finalAmount.toLocaleString("vi-VN")}đ</span>
        </div>

        {paymentType === "installment" && (
          <div className={styles.previewSchedule}>
            <span className={styles.label}>Bảng xem trước lịch trả góp:</span>
            <div className={styles.scheduleGrid}>
              <div className={styles.scheduleCard}>
                Trả trước:
                <strong>{Number(parseMoneyInput(downPayment) || 0).toLocaleString("vi-VN")}đ</strong>
              </div>
              {previewInstallments.map((inst) => (
                <div key={inst.month} className={styles.scheduleCard}>
                  Tháng {inst.month}:
                  <strong>{inst.amount.toLocaleString("vi-VN")}đ</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={styles.submitBtn}
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", boxShadow: "none" }}
            disabled={loading}
          >
            Hủy
          </button>
        )}
        <button type="submit" className={styles.submitBtn} disabled={loading} style={{ flex: 1 }}>
          <Receipt size={20} /> Xuất hóa đơn & Ghi nhận
        </button>
      </div>
    </form>
  );
}
