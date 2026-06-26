"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import styles from "@/app/customer/layout.module.css";
import Logo from "@/components/Logo";
import Link from "next/link";

interface CustomerHeaderProps {
  user: {
    fullName: string;
    phone: string;
    tier: string;
  };
}

export default function CustomerHeader({ user }: CustomerHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/login?role=customer");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo} style={{ display: "flex", alignItems: "center" }}>
        <Logo size="medium" />
      </div>

      <div className={styles.navRight}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.fullName}</span>
          <span className={styles.userRole}>Hạng: {user.tier}</span>
        </div>



        <Link href="/customer/booking" className={styles.logoutBtn} style={{ background: "transparent", border: "1px solid var(--border-color)", marginRight: "0.5rem", textDecoration: "none" }}>
          <span>Đặt lịch</span>
        </Link>

        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={16} />
          <span>Thoát</span>
        </button>
      </div>
    </header>
  );
}
