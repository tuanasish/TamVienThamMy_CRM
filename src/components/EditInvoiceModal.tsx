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
  saleStaffIds: string[];
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
  // Split payment fields
  const [payMethods, setPayMethods] = useState<{
    cash: boolean;
    transfer: boolean;
    homeCredit: boolean;
    miraeAsset: boolean;
    debt: boolean;
  }>({
    cash: true,
    transfer: false,
    homeCredit: false,
    miraeAsset: false,
    debt: false,
  });

  const [payAmounts, setPayAmounts] = useState<{
    cash: string;
    transfer: string;
    homeCredit: string;
    miraeAsset: string;
    debt: string;
  }>({
    cash: "",
    transfer: "",
    homeCredit: "",
    miraeAsset: "",
    debt: "",
  });

  const [installmentMonths, setInstallmentMonths] = useState("1");
  const [bankFee, setBankFee] = useState("0");
  const [internalNotes, setInternalNotes] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
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
      const cash = Number(data.paidAmountCash || 0);
      const transfer = Number(data.paidAmountTransfer || 0);
      const hc = Number(data.paidAmountHomeCredit || 0);
      const ma = Number(data.paidAmountMiraeAsset || 0);
      const debt = Number(data.paidAmountDebt || 0);

      const sumSplit = cash + transfer + hc + ma + debt;

      let initMethods = {
        cash: false,
        transfer: false,
        homeCredit: false,
        miraeAsset: false,
        debt: false,
      };

      let initAmounts = {
        cash: "",
        transfer: "",
        homeCredit: "",
        miraeAsset: "",
        debt: "",
      };

      if (sumSplit > 0) {
        initMethods.cash = cash > 0;
        initMethods.transfer = transfer > 0;
        initMethods.homeCredit = hc > 0;
        initMethods.miraeAsset = ma > 0;
        initMethods.debt = debt > 0;

        initAmounts.cash = cash > 0 ? formatMoneyInput(cash.toString()) : "";
        initAmounts.transfer = transfer > 0 ? formatMoneyInput(transfer.toString()) : "";
        initAmounts.homeCredit = hc > 0 ? formatMoneyInput(hc.toString()) : "";
        initAmounts.miraeAsset = ma > 0 ? formatMoneyInput(ma.toString()) : "";
        initAmounts.debt = debt > 0 ? formatMoneyInput(debt.toString()) : "";
      } else {
        // Fallback for legacy invoice
        const finalAmt = Number(data.finalAmount || 0);
        if (data.paymentType === "installment") {
          const unpaid = data.schedules?.reduce((sum: number, sch: any) => sum + Number(sch.amount), 0) || 0;
          const down = Math.max(0, finalAmt - unpaid);
          initMethods.cash = down > 0 || unpaid === 0;
          initAmounts.cash = down > 0 ? formatMoneyInput(down.toString()) : "";

          if (unpaid > 0) {
            if (data.installmentType === "home_credit") {
              initMethods.homeCredit = true;
              initAmounts.homeCredit = formatMoneyInput(unpaid.toString());
            } else if (data.installmentType === "mirae_asset") {
              initMethods.miraeAsset = true;
              initAmounts.miraeAsset = formatMoneyInput(unpaid.toString());
            } else {
              initMethods.debt = true;
              initAmounts.debt = formatMoneyInput(unpaid.toString());
            }
          }
        } else {
          initMethods.cash = true;
          initAmounts.cash = formatMoneyInput(finalAmt.toString());
        }
      }

      setPayMethods(initMethods);
      setPayAmounts(initAmounts);
      setInstallmentMonths(data.installmentMonths?.toString() || "1");
      setBankFee(formatMoneyInput((data.bankFee || 0).toString()));
      setInternalNotes(data.internalNotes || "");
      
      setEditItems(
        data.items.map((itm: any) => {
          let selectedStaffIds: string[] = [];
          try {
            if (Array.isArray(itm.saleStaffIds)) {
              selectedStaffIds = itm.saleStaffIds;
            } else if (typeof itm.saleStaffIds === "string") {
              selectedStaffIds = JSON.parse(itm.saleStaffIds);
            }
          } catch (e) {}

          return {
            id: itm.id,
            name: getItemName(itm.itemType, itm.itemId),
            itemType: itm.itemType,
            price: Number(itm.price),
            quantity: itm.quantity,
            discount: formatMoneyInput(itm.discount.toString()),
            staffId: itm.staffId || "",
            saleStaffIds: selectedStaffIds,
          };
        })
      );
      setSavedSchedules(data.schedules || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const recalculateSplit = (
    methods: typeof payMethods,
    amounts: typeof payAmounts,
    final: number
  ) => {
    const keys: ("cash" | "transfer" | "homeCredit" | "miraeAsset" | "debt")[] = [
      "cash",
      "transfer",
      "homeCredit",
      "miraeAsset",
      "debt",
    ];

    const activeKeys = keys.filter(k => methods[k]);
    if (activeKeys.length === 0) {
      return {
        cash: formatMoneyInput(final.toString()),
        transfer: "",
        homeCredit: "",
        miraeAsset: "",
        debt: "",
      };
    }

    const remainderKey = activeKeys[0];
    const otherKeys = activeKeys.slice(1);

    let otherSum = 0;
    const updated = { ...amounts };

    otherKeys.forEach((key) => {
      const valNum = Number(parseMoneyInput(amounts[key] || "0")) || 0;
      otherSum += valNum;
    });

    if (otherSum > final) {
      updated[remainderKey] = "0";
    } else {
      const remainderVal = final - otherSum;
      updated[remainderKey] = formatMoneyInput(remainderVal.toString());
    }

    // Clear values of inactive methods
    keys.forEach((key) => {
      if (!methods[key]) {
        updated[key] = "";
      }
    });

    return updated;
  };

  const handleTogglePayMethod = (key: "cash" | "transfer" | "homeCredit" | "miraeAsset" | "debt") => {
    const nextMethods = { ...payMethods, [key]: !payMethods[key] };
    const activeCount = Object.values(nextMethods).filter(Boolean).length;
    if (activeCount === 0) return;

    setPayMethods(nextMethods);
    setPayAmounts((prev) => recalculateSplit(nextMethods, prev, finalAmount));
  };

  const handlePayAmountChange = (key: "cash" | "transfer" | "homeCredit" | "miraeAsset" | "debt", value: string) => {
    const parsedVal = formatMoneyInput(value);
    const nextAmounts = { ...payAmounts, [key]: parsedVal };
    setPayAmounts(recalculateSplit(payMethods, nextAmounts, finalAmount));
  };

  // Update calculations when discount or item inputs change
  useEffect(() => {
    if (!isOpen) return;
    const total = editItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemDiscountsSum = editItems.reduce((sum, item) => sum + (Number(parseMoneyInput(item.discount)) || 0), 0);
    const overallDisc = Number(parseMoneyInput(discount)) || 0;
    const final = Math.max(total - itemDiscountsSum - overallDisc, 0);

    setTotalAmount(total);
    setFinalAmount(final);

    setPayAmounts((prevAmounts) => {
      return recalculateSplit(payMethods, prevAmounts, final);
    });
  }, [editItems, discount, isOpen]);

  // Generate preview schedules for debt if debt > 0
  useEffect(() => {
    const debtVal = Number(parseMoneyInput(payAmounts.debt || "0")) || 0;
    if (payMethods.debt && debtVal > 0) {
      const months = Number(installmentMonths || 1);
      const baseAmt = Math.floor(debtVal / months);
      const list: { month: number; amount: number }[] = [];
      let sumCreated = 0;

      for (let i = 1; i <= months; i++) {
        if (i === months) {
          list.push({ month: i, amount: debtVal - sumCreated });
        } else {
          list.push({ month: i, amount: baseAmt });
          sumCreated += baseAmt;
        }
      }
      setPreviewInstallments(list);
    } else {
      setPreviewInstallments([]);
    }
  }, [payAmounts.debt, payMethods.debt, installmentMonths]);

  // Handle changes for specific items
  const handleItemDiscountChange = (id: string, val: string) => {
    setEditItems(
      editItems.map((item) => (item.id === id ? { ...item, discount: formatMoneyInput(val) } : item))
    );
  };

  const handleItemStaffsChange = (id: string, selectedStaffIds: string[]) => {
    setEditItems(editItems.map((item) => (item.id === id ? { ...item, saleStaffIds: selectedStaffIds } : item)));
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

    const missingStaff = editItems.find((itm) => !itm.saleStaffIds || itm.saleStaffIds.length === 0);
    if (missingStaff) {
      setError(`Vui lòng chọn ít nhất một nhân viên tư vấn (Sale/NV) cho "${missingStaff.name}"`);
      setLoading(false);
      return;
    }
    const cashVal = Number(parseMoneyInput(payAmounts.cash || "0")) || 0;
    const transferVal = Number(parseMoneyInput(payAmounts.transfer || "0")) || 0;
    const hcVal = Number(parseMoneyInput(payAmounts.homeCredit || "0")) || 0;
    const maVal = Number(parseMoneyInput(payAmounts.miraeAsset || "0")) || 0;
    const debtVal = Number(parseMoneyInput(payAmounts.debt || "0")) || 0;

    const totalSplit = cashVal + transferVal + hcVal + maVal + debtVal;
    if (Math.abs(totalSplit - finalAmount) > 1) {
      setError(`Tổng tiền thanh toán của các phương thức (${totalSplit.toLocaleString("vi-VN")}đ) phải bằng tổng hóa đơn (${finalAmount.toLocaleString("vi-VN")}đ)`);
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
          installmentMonths: payMethods.debt ? Number(installmentMonths) : undefined,
          bankFee: Number(parseMoneyInput(bankFee)),
          paidAmountCash: cashVal,
          paidAmountTransfer: transferVal,
          paidAmountHomeCredit: hcVal,
          paidAmountMiraeAsset: maVal,
          paidAmountDebt: debtVal,
          internalNotes,
          items: editItems.map((itm) => ({
            id: itm.id,
            discount: Number(parseMoneyInput(itm.discount)),
            staffId: (itm.saleStaffIds?.[0] ? itm.saleStaffIds[0].split(":")[0] : null) || itm.staffId || null,
            saleStaffIds: itm.saleStaffIds || [],
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: "1 1 auto", width: "100%" }}>
                          <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>Sale/NV (chọn nhiều, nhập % nếu chia không đều):</label>
                          <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.4rem",
                            padding: "0.4rem",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            background: "var(--bg-primary)",
                            maxHeight: "100px",
                            overflowY: "auto",
                            width: "100%"
                          }}>
                            {staff.map((st) => {
                              const isChecked = (item.saleStaffIds || []).some(id => id === st.id || id.startsWith(st.id + ":"));
                              return (
                                <label key={st.id} style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: "0.15rem 0.35rem",
                                  borderRadius: "4px",
                                  background: isChecked ? "rgba(212, 175, 55, 0.1)" : "transparent",
                                  border: isChecked ? "1px solid var(--accent-gold)" : "1px solid transparent",
                                  color: isChecked ? "var(--accent-gold)" : "var(--text-primary)",
                                  fontWeight: isChecked ? 600 : 400
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      let newIds = (item.saleStaffIds || []).filter(id => id !== st.id && !id.startsWith(st.id + ":"));
                                      if (e.target.checked) {
                                        newIds.push(st.id);
                                      }
                                      handleItemStaffsChange(item.id, newIds);
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
                                        handleItemStaffsChange(item.id, newIds);
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
                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label className={styles.label} style={{ fontSize: "0.8rem", color: "var(--accent-gold)", fontWeight: 700 }}>Hình thức thanh toán (Cho phép chọn nhiều)</label>
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.25rem",
                marginTop: "0.5rem",
                marginBottom: "1.25rem",
                width: "100%"
              }}>
                {(() => {
                  const keys: ("cash" | "transfer" | "homeCredit" | "miraeAsset" | "debt")[] = [
                    "cash",
                    "transfer",
                    "homeCredit",
                    "miraeAsset",
                    "debt"
                  ];
                  const activeKeys = keys.filter(k => payMethods[k]);
                  const remainderKey = activeKeys[0];

                  return keys.map((key) => {
                    const isActive = payMethods[key];
                    const isRemainder = key === remainderKey;
                    const labelMap = {
                      cash: "💵 Tiền mặt",
                      transfer: "🏦 Chuyển khoản",
                      homeCredit: "💳 Trả góp Home Credit",
                      miraeAsset: "💳 Trả góp Mirae Asset",
                      debt: "💸 Nợ tại quầy (Spa)"
                    };

                    return (
                      <div key={key} style={{
                        background: "var(--bg-secondary)",
                        border: isActive ? "1px solid var(--accent-gold)" : "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "0.85rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        transition: "all 0.2s ease"
                      }}>
                        <label style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          color: isActive ? "var(--text-primary)" : "var(--text-secondary)"
                        }}>
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => handleTogglePayMethod(key)}
                            style={{
                              width: "16px",
                              height: "16px",
                              accentColor: "var(--accent-gold)",
                              cursor: "pointer"
                            }}
                          />
                          {labelMap[key]}
                        </label>

                        {isActive && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                              {isRemainder ? "Số tiền (Tự động tính toán):" : "Nhập số tiền (đ):"}
                            </span>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="0"
                              value={payAmounts[key]}
                              onChange={(e) => handlePayAmountChange(key, e.target.value)}
                              disabled={isRemainder || loading}
                              style={{
                                background: isRemainder ? "rgba(255,255,255,0.03)" : "var(--bg-primary)",
                                fontWeight: 700,
                                color: isRemainder ? "var(--accent-gold)" : "var(--text-primary)"
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {payMethods.debt && (
                <div className={styles.formGrid} style={{ marginBottom: "1.25rem" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Kỳ hạn thanh toán nợ *</label>
                    <select
                      className={styles.select}
                      value={installmentMonths}
                      onChange={(e) => setInstallmentMonths(e.target.value)}
                      disabled={loading}
                      style={{ fontWeight: 600 }}
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
                </div>
              )}

              <div className={styles.formGrid}>
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
