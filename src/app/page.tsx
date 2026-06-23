import styles from "./page.module.css";
import { User, ShieldAlert, ChevronRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <div className={styles.container}>
      <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem", zIndex: 10 }}>
        <ThemeToggle />
      </div>
      <main className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <Logo size="large" />
        </div>
        <p className={styles.subtitle} style={{ marginTop: 0 }}>Hệ thống Quản lý & Cổng tra cứu Thẩm mỹ viện</p>

        <div className={styles.optionsList}>
          <a href="/login?role=staff" className={styles.optionButton}>
            <div className={styles.optionInfo}>
              <div className={styles.iconWrapper}>
                <ShieldAlert size={20} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div>Phân hệ Nhân viên</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "normal" }}>
                  Quản lý khách hàng, bill, báo cáo & cài đặt
                </div>
              </div>
            </div>
            <ChevronRight className={styles.arrowIcon} size={18} />
          </a>

          <a href="/login?role=customer" className={styles.optionButton}>
            <div className={styles.optionInfo}>
              <div className={styles.iconWrapper}>
                <User size={20} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div>Cổng tra cứu Khách hàng</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "normal" }}>
                  Xem số dư thẻ nạp, liệu trình & lịch sử dịch vụ
                </div>
              </div>
            </div>
            <ChevronRight className={styles.arrowIcon} size={18} />
          </a>
        </div>

        <div className={styles.footer}>© 2026 Spa CRM - Premium Edition</div>
      </main>
    </div>
  );
}
