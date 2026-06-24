"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/customer/booking/page.module.css";
import { Calendar, Clock, Sparkles, Send, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30"
];

interface ServiceProp {
  id: string;
  name: string;
  price: number;
  remainingSessions?: number;
  isPurchased?: boolean;
}

interface BookingFormProps {
  customerId: string;
  services: ServiceProp[];
}

export default function BookingForm({ customerId, services }: BookingFormProps) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState("");
  const [bookDate, setBookDate] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [bookTime, setBookTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !bookDate || !bookTime) {
      setError("Vui lòng chọn dịch vụ và thời gian hẹn");
      return;
    }

    const dateTime = `${bookDate}T${bookTime}`;
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
                {services.filter((s) => s.isPurchased).length > 0 && (
                  <optgroup label="Liệu trình bạn đã sở hữu (Đã thanh toán)">
                    {services.filter((s) => s.isPurchased).map((s) => (
                      <option key={`purchased-${s.id}`} value={s.id}>
                        {s.name} (Còn {s.remainingSessions} buổi)
                      </option>
                    ))}
                  </optgroup>
                )}
                {services.filter((s) => !s.isPurchased).length > 0 && (
                  <optgroup label="Dịch vụ trị liệu khác (Tham khảo)">
                    {services.filter((s) => !s.isPurchased).map((s) => (
                      <option key={`other-${s.id}`} value={s.id}>
                        {s.name} ({s.price.toLocaleString("vi-VN")}đ)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Thời gian */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Ngày hẹn *</label>
              <input
                type="date"
                className={styles.input}
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Giờ hẹn *</label>
              <select
                className={styles.select}
                value={bookTime}
                onChange={(e) => setBookTime(e.target.value)}
                required
                disabled={loading}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
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
