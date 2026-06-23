"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/staff/sales/page.module.css";
import { Receipt, Plus, Trash2 } from "lucide-react";

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
}

interface SelectedItem {
  id: string;
  name: string;
  itemType: "service" | "card";
  price: number;
  quantity: number;
  totalSessions?: number; // for services
}

export default function CreateInvoiceForm({
  customers,
  services,
  cardTemplates,
  staff,
}: CreateInvoiceFormProps) {
  const router = useRouter();

  // State fields
  const [customerId, setCustomerId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [discount, setDiscount] = useState("0");
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

  // Update calculations when items, discount, or payment details change
  useEffect(() => {
    const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const disc = Number(discount) || 0;
    const final = Math.max(total - disc, 0);
    setTotalAmount(total);
    setFinalAmount(final);

    // Calculate installment preview
    if (paymentType === "installment") {
      const months = Number(installmentMonths);
      const down = Number(downPayment) || 0;
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
        itemDetails = {
          id: s.id,
          name: s.name,
          itemType: "service",
          price: s.price,
          quantity: 1,
          totalSessions: 1, // Default 1 session
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
      setError("Vui lòng chọn nhân viên Sale");
      setLoading(false);
      return;
    }
    if (selectedItems.length === 0) {
      setError("Hóa đơn phải có ít nhất 1 dịch vụ hoặc thẻ nạp");
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
          discount: Number(discount),
          finalAmount,
          paymentType,
          installmentMonths: paymentType === "installment" ? Number(installmentMonths) : undefined,
          downPayment: paymentType === "installment" ? Number(downPayment) : 0,
          bankFee: paymentType === "installment" ? Number(bankFee) : 0,
          internalNotes,
          items: selectedItems.map((itm) => ({
            itemType: itm.itemType,
            itemId: itm.id,
            price: itm.price,
            quantity: itm.quantity,
            totalSessions: itm.itemType === "service" ? itm.totalSessions : undefined,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Tạo hóa đơn thất bại");
      }

      router.push(`/staff/customers/${customerId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.card}>
      {error && (
        <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "1rem", borderRadius: "4px", fontSize: "0.95rem", fontWeight: "600", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* 1. Customer & Sale selection */}
      <div className={styles.sectionTitle}>Thông tin khách hàng & bán hàng</div>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Chọn Khách Hàng *</label>
          <select
            className={styles.select}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            disabled={loading}
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
          <label className={styles.label}>Nhân viên Sale (Doanh số) *</label>
          <select
            className={styles.select}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">-- Chọn nhân viên sale --</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Item selector box */}
      <div className={styles.sectionTitle}>Sản phẩm & Dịch vụ bán hàng</div>
      <div className={styles.itemSelectionBox}>
        <div className={styles.formGrid} style={{ marginBottom: 0, alignItems: "flex-end" }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Loại món hàng</label>
            <select
              className={styles.select}
              value={selectedItemType}
              onChange={(e) => {
                setSelectedItemType(e.target.value as any);
                setSelectedItemId("");
              }}
              disabled={loading}
            >
              <option value="service">Dịch vụ (Liệu trình)</option>
              <option value="card">Thẻ tài khoản trả trước</option>
            </select>
          </div>

          <div className={styles.formGroup} style={{ flex: 2 }}>
            <label className={styles.label}>Chọn món cụ thể</label>
            {selectedItemType === "service" ? (
              <select
                className={styles.select}
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Chọn dịch vụ --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.price.toLocaleString("vi-VN")}đ)
                  </option>
                ))}
              </select>
            ) : (
              <select
                className={styles.select}
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Chọn thẻ nạp --</option>
                {cardTemplates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.name} (Giá gốc: ${c.price.toLocaleString("vi-VN")}đ → Tài khoản: ${c.value.toLocaleString("vi-VN")}đ)`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className={styles.submitBtn}
            style={{ width: "auto", height: "38px", padding: "0 1.5rem" }}
            disabled={loading}
          >
            <Plus size={16} /> Thêm vào bill
          </button>
        </div>

        {/* Selected items rows */}
        <div className={styles.selectedItemsList}>
          {selectedItems.map((item) => (
            <div key={`${item.id}-${item.itemType}`} className={styles.selectedItemRow}>
              <div className={styles.itemDetails}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemPrice}>
                  Giá trị: <strong>{item.price.toLocaleString("vi-VN")}đ</strong>
                </span>
              </div>

              <div className={styles.itemActions}>
                {item.itemType === "service" && (
                  <div className={styles.formGroup} style={{ width: "130px", flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                    <label className={styles.label} style={{ whiteSpace: "nowrap" }}>Số buổi:</label>
                    <input
                      type="number"
                      className={styles.input}
                      style={{ padding: "0.25rem 0.5rem", textAlign: "center" }}
                      value={item.totalSessions || 1}
                      onChange={(e) => handleSessionsChange(item.id, Number(e.target.value))}
                      min="1"
                      disabled={loading}
                    />
                  </div>
                )}

                <div className={styles.formGroup} style={{ width: "110px", flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                  <label className={styles.label} style={{ whiteSpace: "nowrap" }}>SL:</label>
                  <input
                    type="number"
                    className={styles.input}
                    style={{ padding: "0.25rem 0.5rem", textAlign: "center" }}
                    value={item.quantity}
                    onChange={(e) => handleQtyChange(item.id, item.itemType, Number(e.target.value))}
                    min="1"
                    disabled={loading}
                  />
                </div>

                <Trash2
                  size={18}
                  className={styles.removeBtn}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleRemoveItem(item.id, item.itemType)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Invoicing configuration & payments options */}
      <div className={styles.sectionTitle}>Hình thức thanh toán</div>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Chiết khấu / Giảm giá (đ)</label>
          <input
            type="number"
            className={styles.input}
            placeholder="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
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
                type="number"
                className={styles.input}
                placeholder="0"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Phí trả góp ngân hàng (đ)</label>
              <input
                type="number"
                className={styles.input}
                placeholder="0"
                value={bankFee}
                onChange={(e) => setBankFee(e.target.value)}
                disabled={loading}
              />
            </div>
          </>
        )}

        <div className={`${styles.formGroup} ${styles.formFull}`}>
          <label className={styles.label}>Ghi chú nội bộ</label>
          <textarea
            className={styles.textarea}
            placeholder="Ví dụ: trả góp qua thẻ tín dụng Sacombank..."
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
          <span>Cộng tiền hàng:</span>
          <span>{totalAmount.toLocaleString("vi-VN")}đ</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Chiết khấu giảm giá:</span>
          <span style={{ color: "#dc3545" }}>-{Number(discount || 0).toLocaleString("vi-VN")}đ</span>
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
                <strong>{Number(downPayment || 0).toLocaleString("vi-VN")}đ</strong>
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

      <button type="submit" className={styles.submitBtn} style={{ marginTop: "1rem" }} disabled={loading}>
        <Receipt size={20} />
        {loading ? "Đang xử lý..." : "Lập Hóa Đơn & Lưu"}
      </button>
    </form>
  );
}
