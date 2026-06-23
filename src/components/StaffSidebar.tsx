"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/app/staff/layout.module.css";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Settings, 
  BarChart3, 
  LogOut,
  Sparkles
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

interface StaffSidebarProps {
  user: {
    fullName: string;
  };
}

export default function StaffSidebar({ user }: StaffSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: "Tổng quan", path: "/staff", icon: <LayoutDashboard size={20} /> },
    { name: "Khách hàng", path: "/staff/customers", icon: <Users size={20} /> },
    { name: "Dịch vụ", path: "/staff/services", icon: <Sparkles size={20} /> },
    { name: "Bán hàng", path: "/staff/sales", icon: <Receipt size={20} /> },
    { name: "Báo cáo", path: "/staff/reports", icon: <BarChart3 size={20} /> },
    { name: "Cấu hình", path: "/staff/config", icon: <Settings size={20} /> },
  ];

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.brand} style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0 1.25rem 0", borderBottom: "1px solid var(--border-color)" }}>
          <Logo size="medium" />
        </div>
        <nav className={styles.menuList} style={{ marginTop: "1.5rem" }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/staff" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.menuItem} ${isActive ? styles.activeMenuItem : ""}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={styles.footerSection}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", width: "100%" }}>
          <div className={styles.userInfo} style={{ margin: 0 }}>
            <div className={styles.userLabel}>{user.fullName}</div>
            <div className={styles.userRole}>Nhân viên Lễ tân</div>
          </div>
          <ThemeToggle />
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={20} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
