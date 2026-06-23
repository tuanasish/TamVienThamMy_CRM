"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/customer/booking/page.module.css";
import { Calendar, Clock, Sparkles, Send, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface ServiceProp {
  id: string;
  name: string;
  price: number;
}

interface BookingFormProps {
  customerId: string;
  services: ServiceProp[];
}

export default function BookingForm({ customerId, services }: BookingFormProps) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !dateTime) {
      setError("Vui lòng chọn dịch vụ và thời gian hẹn");
      return;
    }

    // Verify time is in the future
    const selectedDate = new Date(dateTime);
    if (selectedDate <= new Date()) {
      setError("Thời gian đặt lịch phải ở tương lai");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const selectedService = services.find((s) => s.id === serviceId);
      const apptNotes = notes 
        ? `${selectedService?.name}. Ghi chú: ${notes}`
        : `${selectedService?.name}`;

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          dateTime,
          notes: apptNotes,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể gửi lịch hẹn");

      setSuccess(true);
      setTimeout(() => {
        router.push("/customer");
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formCard}>
      {success ? (
        <div className={styles.successBlock}>
          <div className={styles.successIcon}>🎉</div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-gold)", margin: "0.5rem 0" }}>
            Đặt lịch thành công!
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Hệ thống đang chuyển bạn về Trang chủ...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {error && <div className={styles.errorAlert}>{error}</div>}

          {/* Dịch vụ */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Dịch vụ trị liệu mong muốn *</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">-- Chọn dịch vụ --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.price.toLocaleString("vi-VN")}đ)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Thời gian */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Ngày & Giờ hẹn *</label>
            <input
              type="datetime-local"
              className={styles.input}
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Ghi chú */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Ghi chú chi tiết / Yêu cầu đặc biệt</label>
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Ví dụ: Yêu cầu kỹ thuật viên quen thuộc, trị mụn ẩn..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/customer" className={styles.backBtn}>
              <ArrowLeft size={16} /> Quay lại
            </Link>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spin} /> Đang gửi...
                </>
              ) : (
                <>
                  <Send size={16} /> Xác nhận đặt lịch
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
