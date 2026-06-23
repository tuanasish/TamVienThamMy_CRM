"use client";

import { useState, useEffect } from "react";
import styles from "@/app/staff/sales/page.module.css";
import { Edit, Receipt, X } from "lucide-react";

const formatMoneyInput = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseMoneyInput = (val: string) => {
  return val.replace(/\./g, "");
};

interface EditInvoiceModalProps {
  invoice: {
    id: string;
    customerId: string;
    customer: {
      fullName: string;
      phone: string;
    };
    totalAmount: number;
    discount: number;
    finalAmount: number;
  };
  services: { id: string; name: string; price: number; type: string }[];
  cardTemplates: { id: string; name: string; price: number; value: number }[];
  staff: { id: string; fullName: string }[];
  onSuccess: () => void;
}

interface EditableItem {
  id: string;
  name: string;
  itemType: "service" | "product" | "card";
  price: number;
  quantity: number;
  discount: string; // localized string format
  staffId: string;
}

export default function EditInvoiceModal({
  invoice,
  services,
  cardTemplates,
  staff,
  onSuccess,
}: EditInvoiceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Invoice-level editable states
  const [staffId, setStaffId] = useState(""); // Cashier
  const [discount, setDiscount] = useState("0"); // Overall discount
  const [paymentType, setPaymentType] = useState<"cash" | "installment">("cash");
  const [installmentType, setInstallmentType] = useState("counter");
  const [installmentMonths, setInstallmentMonths] = useState("6");
  const [downPayment, setDownPayment] = useState("0");
  const [bankFee, setBankFee] = useState("0");
  const [internalNotes, setInternalNotes] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);

  // Derived calculation states
  const [totalAmount, setTotalAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [previewInstallments, setPreviewInstallments] = useState<{ month: number; amount: number }[]>([]);

  const getItemName = (itemType: string, itemId: string) => {
    if (itemType === "card") {
      return cardTemplates.find((c) => c.id === itemId)?.name || "Thẻ nạp";
    }
    return services.find((s) => s.id === itemId)?.name || "Dịch vụ/Sản phẩm";
  };

  // Fetch full details on open
  const handleOpen = async () => {
    setError("");
    setLoading(true);
    setIsOpen(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Không thể tải chi tiết hóa đơn");
      }

      setStaffId(data.staffId || "");
      setDiscount(formatMoneyInput(data.discount.toString()));
      setPaymentType(data.paymentType as any);
      setInstallmentType(data.installmentType || "counter");
      setInstallmentMonths(data.installmentMonths?.toString() || "6");
      setDownPayment(formatMoneyInput((data.downPayment || 0).toString()));
      setBankFee(formatMoneyInput((data.bankFee || 0).toString()));
      setInternalNotes(data.internalNotes || "");
      
      setEditItems(
        data.items.map((itm: any) => ({
          id: itm.id,
          name: getItemName(itm.itemType, itm.itemId),
          itemType: itm.itemType,
          price: Number(itm.price),
          quantity: itm.quantity,
          discount: formatMoneyInput(itm.discount.toString()),
          staffId: itm.staffId || "",
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update calculations when discount, payments, or item inputs change
  useEffect(() => {
    if (!isOpen) return;
    const total = editItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemDiscountsSum = editItems.reduce((sum, item) => sum + (Number(parseMoneyInput(item.discount)) || 0), 0);
    const overallDisc = Number(parseMoneyInput(discount)) || 0;
    const final = Math.max(total - itemDiscountsSum - overallDisc, 0);

    setTotalAmount(total);
    setFinalAmount(final);

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
  }, [editItems, discount, paymentType, installmentMonths, downPayment, isOpen]);

  // Handle changes for specific items
  const handleItemDiscountChange = (id: string, val: string) => {
    setEditItems(
      editItems.map((item) => (item.id === id ? { ...item, discount: formatMoneyInput(val) } : item))
    );
  };

  const handleItemStaffChange = (id: string, staffIdVal: string) => {
    setEditItems(editItems.map((item) => (item.id === id ? { ...item, staffId: staffIdVal } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!staffId) {
      setError("Vui lòng chọn nhân viên thu ngân");
      setLoading(false);
      return;
    }

    const missingStaff = editItems.find((itm) => !itm.staffId);
    if (missingStaff) {
      setError(`Vui lòng chọn nhân viên chịu trách nhiệm/sale cho "${missingStaff.name}"`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          discount: Number(parseMoneyInput(discount)),
          paymentType,
          installmentType: paymentType === "installment" ? installmentType : undefined,
          installmentMonths: paymentType === "installment" ? Number(installmentMonths) : undefined,
          downPayment: paymentType === "installment" ? Number(parseMoneyInput(downPayment)) : 0,
          bankFee: paymentType === "installment" ? Number(parseMoneyInput(bankFee)) : 0,
          internalNotes,
          items: editItems.map((itm) => ({
            id: itm.id,
            discount: Number(parseMoneyInput(itm.discount)),
            staffId: itm.staffId,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Cập nhật hóa đơn thất bại");
      }

      setIsOpen(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`${styles.actionBtnSmall} ${styles.btnEdit}`}
        title="Chỉnh sửa hóa đơn"
      >
        <Edit size={14} /> Sửa
      </button>

      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: "800px", padding: "1.5rem" }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--text-primary)" }}>
                Điều chỉnh hóa đơn của: {invoice.customer.fullName} ({invoice.customer.phone})
              </h3>
              <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.1)", padding: "1rem", borderRadius: "4px", fontSize: "0.95rem", fontWeight: "600", marginTop: "1rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: "1rem", maxHeight: "70vh", overflowY: "auto", paddingRight: "5px" }}>
              <div className={styles.sectionTitle}>Thông tin chung</div>
              <div className={styles.formGrid}>
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

                <div className={styles.formGroup}>
                  <label className={styles.label}>Chiết khấu hóa đơn chung (đ)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={discount}
                    onChange={(e) => setDiscount(formatMoneyInput(e.target.value))}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Items List inside invoice */}
              <div className={styles.sectionTitle}>Mặt hàng trong hóa đơn</div>
              <div className={styles.selectedItemsList} style={{ marginBottom: "1.5rem" }}>
                {editItems.map((item) => (
                  <div key={item.id} className={styles.selectedItemRow}>
                    <div className={styles.itemDetails}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemPrice}>
                        Đơn giá: {item.price.toLocaleString("vi-VN")}đ | SL: <strong>{item.quantity}</strong>
                      </span>
                    </div>

                    <div className={styles.itemActions}>
                      <div className={`${styles.formGroup} ${styles.itemActionRow} ${styles.widthDiscount}`}>
                        <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>Giảm:</label>
                        <input
                          type="text"
                          className={`${styles.input} ${styles.actionInput}`}
                          value={item.discount}
                          onChange={(e) => handleItemDiscountChange(item.id, e.target.value)}
                          disabled={loading}
                        />
                      </div>

                      <div className={`${styles.formGroup} ${styles.itemActionRow} ${styles.widthStaff}`}>
                        <label className={styles.label} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>Sale/NV:</label>
                        <select
                          className={`${styles.select} ${styles.actionInput}`}
                          value={item.staffId}
                          onChange={(e) => handleItemStaffChange(item.id, e.target.value)}
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
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Methods Options */}
              <div className={styles.sectionTitle}>Hình thức thanh toán</div>
              <div className={styles.formGrid}>
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
                      <label className={styles.label}>Loại trả góp (Đối tác / Hình thức)</label>
                      <select
                        className={styles.select}
                        value={installmentType}
                        onChange={(e) => setInstallmentType(e.target.value)}
                        disabled={loading}
                      >
                        <option value="home_credit">Home Credit</option>
                        <option value="mirae_asset">Mirae Asset</option>
                        <option value="counter">Trả góp tại quầy (Spa)</option>
                      </select>
                    </div>

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
                    placeholder="Ghi chú nội bộ..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    disabled={loading}
                    style={{ minHeight: "60px" }}
                  />
                </div>
              </div>

              {/* Financial summary preview */}
              <div className={styles.summarySection}>
                <div className={styles.summaryRow}>
                  <span>Cộng giá gốc:</span>
                  <span>{totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Giảm giá mặt hàng:</span>
                  <span style={{ color: "#dc3545" }}>
                    -{editItems.reduce((sum, itm) => sum + (Number(parseMoneyInput(itm.discount)) || 0), 0).toLocaleString("vi-VN")}đ
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
                    <span className={styles.label}>Bảng xem trước lịch trả góp mới:</span>
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
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={styles.submitBtn}
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", boxShadow: "none" }}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.submitBtn} disabled={loading} style={{ flex: 1 }}>
                  <Receipt size={20} /> Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
