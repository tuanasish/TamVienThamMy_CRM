"use client";

import { useState } from "react";
import { Receipt, X } from "lucide-react";
import styles from "@/app/staff/sales/page.module.css";
import CreateInvoiceForm from "./CreateInvoiceForm";

interface CreateInvoiceModalProps {
  customer: {
    id: string;
    fullName: string;
    phone: string;
    tier: string;
  };
  services: any[];
  cardTemplates: any[];
  staff: any[];
  onSuccess?: () => void;
}

export default function CreateInvoiceModal({
  customer,
  services,
  cardTemplates,
  staff,
  onSuccess,
}: CreateInvoiceModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSuccess = () => {
    setIsOpen(false);
    if (onSuccess) {
      onSuccess();
    }
  };

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
          background: "linear-gradient(135deg, #1b4d3e 0%, #2d7a60 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: "0.9rem"
        }}
      >
        <Receipt size={18} />
        <span>Tạo hóa đơn bán hàng</span>
      </button>

      {isOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
          <div
            className={styles.modalContent}
            style={{
              maxWidth: "1000px",
              width: "95%",
              maxHeight: "92vh",
              overflowY: "auto",
              position: "relative",
              padding: "1.5rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <div className={styles.modalHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Receipt size={20} style={{ color: "var(--accent-gold)" }} />
                <span>Tạo hóa đơn thanh toán - Khách hàng: <span style={{ color: "var(--accent-gold)" }}>{customer.fullName}</span></span>
              </h3>
              <button onClick={handleClose} className={styles.closeBtn} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <CreateInvoiceForm
              customers={[customer]}
              services={services}
              cardTemplates={cardTemplates}
              staff={staff}
              initialCustomerId={customer.id}
              onSuccess={handleSuccess}
              onCancel={handleClose}
            />
          </div>
        </div>
      )}
    </>
  );
}
