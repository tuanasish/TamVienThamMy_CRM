"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/sales/page.module.css";
import { Receipt, Plus, Trash2 } from "lucide-react";

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
  const [staffId, setStaffId] = useState(""); // Cashier staff
  const [discount, setDiscount] = useState("0"); // Invoice level overall discount
  const [paymentType, setPaymentType] = useState<"cash" | "installment">("cash");
  const [installmentMonths, setInstallmentMonths] = useState("6");
  const [downPayment, setDownPayment] = useState("0");
  const [bankFee, setBankFee] = useState("0");
  const [internalNotes, setInternalNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Selector fields
  const [selectedItemType, setSelectedItemType] = useState<"service" | "card">("service");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

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

    // Calculate installment preview
    if (paymentType === "installment") {
      const months = Number(installmentMonths);
      const down = Number(parseMoneyInput(downPayment)) || 0;
      const debt = Math.max(final - down, 0);
      
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
      setPreviewInstallments([]);
    }
  }, [selectedItems, discount, paymentType, installmentMonths, downPayment]);

  const handleAddItem = () => {
    if (!selectedItemId) return;
    
    // Find item details
    let itemDetails: SelectedItem | undefined;
    if (selectedItemType === "service") {
      const s = services.find((sv) => sv.id === selectedItemId);
      if (s) {
        // Find if this is service or product based on db search
        itemDetails = {
          id: s.id,
          name: s.name,
          itemType: "service", // Default type
          price: s.price,
          quantity: 1,
          totalSessions: 1, // Default 1 session
          discount: "0",
          staffId: staffId || "",
        };
      }
    } else {
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
          <select
            className={styles.select}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            disabled={loading || !!initialCustomerId}
          >
            <option value="">-- Chọn khách hàng --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.phone})
              </option>
            ))}
          </select>
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
        <div className={styles.formGrid} style={{ marginBottom: 0, alignItems: "flex-end" }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Phân loại mặt hàng</label>
            <select
              className={styles.select}
              value={selectedItemType}
              onChange={(e) => {
                setSelectedItemType(e.target.value as any);
                setSelectedItemId("");
              }}
              disabled={loading}
            >
              <option value="service">Dịch vụ & Sản phẩm</option>
              <option value="card">Thẻ thành viên (Thẻ nạp)</option>
            </select>
          </div>

          <div className={styles.formGroup} style={{ flexGrow: 2 }}>
            <label className={styles.label}>Chọn mặt hàng cụ thể</label>
            <select
              className={styles.select}
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Chọn mặt hàng --</option>
              {selectedItemType === "service"
                ? services.map((sv) => (
                    <option key={sv.id} value={sv.id}>
                      {sv.name} ({sv.price.toLocaleString("vi-VN")}đ)
                    </option>
                  ))
                : cardTemplates.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} (Bán: {tc.price.toLocaleString("vi-VN")}đ | Nhận: {tc.value.toLocaleString("vi-VN")}đ)
                    </option>
                  ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className={styles.submitBtn}
            style={{ width: "auto", height: "42px", padding: "0 1.5rem" }}
            disabled={loading}
          >
            <Plus size={16} /> Thêm vào đơn
          </button>
        </div>

        {/* Selected Items List */}
        <div className={styles.selectedItemsList}>
          {selectedItems.length === 0 ? (
            <div className={styles.emptyText} style={{ padding: "1.5rem" }}>Chưa có mặt hàng nào được chọn.</div>
          ) : (
            selectedItems.map((item) => (
              <div key={`${item.id}-${item.itemType}`} className={styles.selectedItemRow} style={{ flexWrap: "wrap", gap: "1rem" }}>
                <div className={styles.itemDetails} style={{ minWidth: "200px", flex: "1 1 auto" }}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemPrice}>
                    Đơn giá: <strong>{item.price.toLocaleString("vi-VN")}đ</strong>
                  </span>
                </div>

                <div className={styles.itemActions} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
                  {item.itemType === "service" && (
                    <div className={styles.formGroup} style={{ width: "90px", flexDirection: "row", alignItems: "center", gap: "0.35rem" }}>
                      <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>Số buổi:</label>
                      <input
                        type="number"
                        className={styles.input}
                        style={{ padding: "0.25rem 0.5rem", textAlign: "center", fontSize: "0.85rem" }}
                        value={item.totalSessions || 1}
                        onChange={(e) => handleSessionsChange(item.id, Number(e.target.value))}
                        min="1"
                        disabled={loading}
                      />
                    </div>
                  )}

                  <div className={styles.formGroup} style={{ width: "70px", flexDirection: "row", alignItems: "center", gap: "0.35rem" }}>
                    <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>SL:</label>
                    <input
                      type="number"
                      className={styles.input}
                      style={{ padding: "0.25rem 0.5rem", textAlign: "center", fontSize: "0.85rem" }}
                      value={item.quantity}
                      onChange={(e) => handleQtyChange(item.id, item.itemType, Number(e.target.value))}
                      min="1"
                      disabled={loading}
                    />
                  </div>

                  {/* CUSTOM DISCOUNT PER ITEM */}
                  <div className={styles.formGroup} style={{ width: "120px", flexDirection: "row", alignItems: "center", gap: "0.35rem" }}>
                    <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>Giảm:</label>
                    <input
                      type="text"
                      className={styles.input}
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                      placeholder="0"
                      value={item.discount}
                      onChange={(e) => handleItemDiscountChange(item.id, item.itemType, e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* STAFF / SALE SELECTION PER ITEM */}
                  <div className={styles.formGroup} style={{ width: "160px", flexDirection: "row", alignItems: "center", gap: "0.35rem" }}>
                    <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>Sale/NV:</label>
                    <select
                      className={styles.select}
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
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
                    style={{ cursor: "pointer", color: "var(--accent-rose)", marginLeft: "0.5rem" }}
                    onClick={() => handleRemoveItem(item.id, item.itemType)}
                  />
                </div>
              </div>
            ))
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
          <label className={styles.label}>Phương thức thanh toán</label>
          <select
            className={styles.select}
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as any)}
            disabled={loading}
          >
            <option value="cash">Trả thẳng (Tiền mặt/Chuyển khoản)</option>
            <option value="installment">Trả góp</option>
          </select>
        </div>

        {paymentType === "installment" && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>Kỳ hạn trả góp (tháng)</label>
              <select
                className={styles.select}
                value={installmentMonths}
                onChange={(e) => setInstallmentMonths(e.target.value)}
                disabled={loading}
              >
                <option value="6">6 tháng</option>
                <option value="9">9 tháng</option>
                <option value="12">12 tháng</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Số tiền trả trước (đ)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="0"
                value={downPayment}
                onChange={(e) => setDownPayment(formatMoneyInput(e.target.value))}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Phí trả góp ngân hàng (đ)</label>
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
