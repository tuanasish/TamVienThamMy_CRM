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
  const [installmentMonths, setInstallmentMonths] = useState("1");
  const [downPayment, setDownPayment] = useState("0");
  const [bankFee, setBankFee] = useState("0");
  const [internalNotes, setInternalNotes] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [isDownPaymentManuallyEdited, setIsDownPaymentManuallyEdited] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState<any[]>([]);

  const handleToggleInstallment = async (scheduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/installments/${scheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật trạng thái kỳ trả góp");
      }
      
      // Update local state immediately for visual feedback
      setSavedSchedules(prev =>
        prev.map(s => s.id === scheduleId ? { ...s, status: newStatus, paidAt: newStatus === "paid" ? new Date().toISOString() : null } : s)
      );
      
      // Trigger parent success callback to refresh the page/dashboard data
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      setInstallmentMonths(data.installmentMonths?.toString() || "1");
      setDownPayment(formatMoneyInput((data.downPayment || 0).toString()));
      setBankFee(formatMoneyInput((data.bankFee || 0).toString()));
      setInternalNotes(data.internalNotes || "");
      setIsDownPaymentManuallyEdited(data.paymentType === "installment");
      
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
      setSavedSchedules(data.schedules || []);
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
      const months = Number(installmentMonths || 1);
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
  }, [editItems, discount, installmentMonths, downPayment, isDownPaymentManuallyEdited, isOpen]);

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
          <div className={styles.modalContent} style={{ maxWidth: "700px" }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                ✏️ Chỉnh sửa hóa đơn
              </h3>
              <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            {/* Customer info banner */}
            <div style={{
              background: "rgba(197,160,89,0.06)",
              border: "1px solid rgba(197,160,89,0.15)",
              borderRadius: "8px",
              padding: "0.65rem 1rem",
              marginTop: "0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
            }}>
              Khách hàng: <strong style={{ color: "var(--text-primary)" }}>{invoice.customer.fullName}</strong> • {invoice.customer.phone}
            </div>

            {error && (
              <div style={{ color: "#dc3545", background: "rgba(220,53,69,0.08)", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, marginTop: "0.75rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: "0.75rem", maxHeight: "65vh", overflowY: "auto", paddingRight: "4px" }}>
              {/* Section 1: General */}
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                Thông tin chung
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Thu ngân *</label>
                  <select className={styles.select} value={staffId} onChange={(e) => setStaffId(e.target.value)} required disabled={loading}>
                    <option value="">-- Chọn --</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Chiết khấu chung (đ)</label>
                  <input type="text" className={styles.input} value={discount} onChange={(e) => setDiscount(formatMoneyInput(e.target.value))} disabled={loading} />
                </div>
              </div>

              {/* Section 2: Items */}
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                Mặt hàng ({editItems.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
                {editItems.map((item) => {
                  const itemDiscountVal = Number(parseMoneyInput(item.discount || "0")) || 0;
                  const itemSubtotal = Math.max((item.price * item.quantity) - itemDiscountVal, 0);
                  return (
                    <div key={item.id} style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "0.65rem 0.85rem",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{item.name}</span>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>
                            {item.price.toLocaleString("vi-VN")}đ × {item.quantity}
                          </span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-gold)", display: "block", marginTop: "0.1rem" }}>
                            Thành tiền: {itemSubtotal.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flex: "0 0 auto" }}>
                          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>Giảm:</label>
                          <input
                            type="text"
                            className={`${styles.input} ${styles.actionInput}`}
                            style={{ width: "100px" }}
                            value={item.discount}
                            onChange={(e) => handleItemDiscountChange(item.id, e.target.value)}
                            disabled={loading}
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flex: "1 1 auto", minWidth: "120px" }}>
                          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>NV:</label>
                          <select
                            className={`${styles.select} ${styles.actionInput}`}
                            value={item.staffId}
                            onChange={(e) => handleItemStaffChange(item.id, e.target.value)}
                            disabled={loading}
                            required
                          >
                            <option value="">-- Chọn --</option>
                            {staff.map((st) => (
                              <option key={st.id} value={st.id}>{st.fullName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Section 2.5: Saved Installments (Debt Collection) */}
              {savedSchedules.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-rose)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    💸 Chi tiết công nợ & Thu nợ trực tiếp
                  </div>
                  <div style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}>
                    {savedSchedules.map((s: any, idx: number) => {
                      const isPaid = s.status === "paid";
                      return (
                        <div key={s.id} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem 0.75rem",
                          background: isPaid ? "rgba(40, 167, 69, 0.04)" : "rgba(220, 53, 69, 0.03)",
                          border: `1px solid ${isPaid ? "rgba(40, 167, 69, 0.15)" : "rgba(220, 53, 69, 0.15)"}`,
                          borderRadius: "6px",
                          transition: "all 0.2s ease"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <input
                              type="checkbox"
                              checked={isPaid}
                              disabled={loading}
                              onChange={() => handleToggleInstallment(s.id, s.status)}
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                                accentColor: "#28a745"
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.88rem", color: isPaid ? "#28a745" : "#dc3545" }}>
                                Kỳ {idx + 1}: {Number(s.amount).toLocaleString("vi-VN")}đ
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                Hạn trả: {new Date(s.dueDate).toLocaleDateString("vi-VN")}
                                {isPaid && s.paidAt && ` • Đã thu lúc ${new Date(s.paidAt).toLocaleDateString("vi-VN")}`}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            background: isPaid ? "rgba(40, 167, 69, 0.12)" : "rgba(220, 53, 69, 0.12)",
                            color: isPaid ? "#28a745" : "#dc3545"
                          }}>
                            {isPaid ? "Đã thu nợ" : "Chưa thu"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 3: Payment */}
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                Thanh toán
              </div>
              <div className={styles.formGrid}>
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
                  <textarea className={styles.textarea} placeholder="Ghi chú..." value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} disabled={loading} style={{ minHeight: "50px" }} />
                </div>
              </div>

              {/* Summary */}
              <div className={styles.summarySection} style={{ padding: "1rem 1.25rem" }}>
                <div className={styles.summaryRow}>
                  <span>Giá gốc:</span>
                  <span>{totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Giảm mặt hàng:</span>
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
                    <span className={styles.label}>Lịch trả góp mới:</span>
                    <div className={styles.scheduleGrid}>
                      <div className={styles.scheduleCard}>
                        Trả trước:
                        <strong>{Number(parseMoneyInput(downPayment) || 0).toLocaleString("vi-VN")}đ</strong>
                      </div>
                      {previewInstallments.map((inst) => (
                        <div key={inst.month} className={styles.scheduleCard}>
                          T{inst.month}:
                          <strong>{inst.amount.toLocaleString("vi-VN")}đ</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer buttons */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`${styles.actionBtnSmall} ${styles.btnGhost}`}
                  style={{ padding: "0.6rem 1.5rem", fontSize: "0.9rem" }}
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  <Receipt size={18} /> Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
