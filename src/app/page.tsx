import styles from "./page.module.css";
import { User, ShieldAlert, ChevronRight } from "lucide-react";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <Logo size="large" />
        </div>
        <p className={styles.subtitle} style={{ marginTop: 0 }}>Hệ thống quản lý và chăm sóc khách hàng 24/7</p>

        <div className={styles.optionsList}>
          <a href="/login?role=staff" className={styles.optionButton}>
            <div className={styles.optionInfo}>
              <div className={styles.iconWrapper}>
                <ShieldAlert size={20} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div>Cán bộ nhân viên</div>
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
                <div>Khách hàng</div>
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
