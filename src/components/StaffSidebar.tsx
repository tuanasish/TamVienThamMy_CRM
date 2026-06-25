"use client";

import { useState, useEffect } from "react";
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
  Sparkles,
  Calendar,
  Wallet,
  Tag,
  Lock,
  Unlock,
  UserCog
} from "lucide-react";
import Logo from "@/components/Logo";

interface StaffSidebarProps {
  user: {
    fullName: string;
    dbRole?: string;
  };
}

export default function StaffSidebar({ user }: StaffSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [maintenance, setMaintenance] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);

  useEffect(() => {
    // Fetch initial maintenance status
    fetch("/api/system/maintenance")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.maintenance === "boolean") {
          setMaintenance(data.maintenance);
        }
      })
      .catch((err) => console.error("Error loading maintenance status:", err));
  }, []);

  const handleToggleMaintenance = async () => {
    const confirmMsg = maintenance 
      ? "Bạn có chắc chắn muốn MỞ CỬA lại hệ thống Cổng khách hàng?" 
      : "Bạn có chắc chắn muốn ĐÓNG HỆ THỐNG Cổng khách hàng để BẢO TRÌ định kỳ?";
    if (!confirm(confirmMsg)) return;

    setUpdatingConfig(true);
    try {
      const response = await fetch("/api/system/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance: !maintenance }),
      });
      const data = await response.json();
      if (response.ok) {
        setMaintenance(data.maintenance);
      } else {
        alert(data.error || "Không thể cập nhật trạng thái bảo trì");
      }
    } catch (e) {
      alert("Lỗi hệ thống khi kết nối");
    } finally {
      setUpdatingConfig(false);
    }
  };

  const rawMenuItems = [
    { name: "Tổng quan", path: "/staff", icon: <LayoutDashboard size={20} /> },
    { name: "Khách hàng", path: "/staff/customers", icon: <Users size={20} /> },
    { name: "Lịch hẹn", path: "/staff/appointments", icon: <Calendar size={20} /> },
    { name: "Dịch vụ", path: "/staff/services", icon: <Sparkles size={20} /> },
    { name: "Bán hàng", path: "/staff/sales", icon: <Receipt size={20} /> },
    { name: "Quản lý công nợ", path: "/staff/debts", icon: <Wallet size={20} /> },
    { name: "Chương trình ưu đãi", path: "/staff/promotions", icon: <Tag size={20} /> },
    { name: "Quản lý nhân viên", path: "/staff/users", icon: <UserCog size={20} />, adminOnly: true },
    { name: "Báo cáo", path: "/staff/reports", icon: <BarChart3 size={20} />, adminOnly: true },
  ];

  const menuItems = rawMenuItems.filter((item) => !item.adminOnly || user.dbRole === "admin");

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
    <>
      {/* Mobile Top Header */}
      <header className={styles.mobileHeader}>
        <Logo size="small" />
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={handleLogout} className={styles.logoutIconBtn} title="Đăng xuất">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Sidebar / Bottom Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>
            <Logo size="medium" />
          </div>
          <nav className={styles.menuList}>
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
          {/* Maintenance Toggle (Admin Only) */}
          {user.dbRole === "admin" && (
            <div style={{
              background: "rgba(197, 160, 89, 0.05)",
              border: "1px solid rgba(197, 160, 89, 0.15)",
              borderRadius: "10px",
              padding: "0.65rem 0.8rem",
              marginBottom: "0.75rem",
              fontSize: "0.82rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-secondary, #5a5a5a)", fontWeight: 600 }}>Cổng Khách hàng:</span>
                <span style={{
                  color: maintenance ? "#d9383a" : "#228b22",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  textTransform: "uppercase"
                }}>
                  {maintenance ? "Bảo trì" : "Mở cửa"}
                </span>
              </div>
              <button
                onClick={handleToggleMaintenance}
                disabled={updatingConfig}
                style={{
                  width: "100%",
                  padding: "0.45rem",
                  borderRadius: "6px",
                  border: "none",
                  background: maintenance ? "rgba(34, 139, 34, 0.12)" : "rgba(217, 56, 58, 0.09)",
                  color: maintenance ? "#1b6d1b" : "#b02a2b",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem"
                }}
              >
                {updatingConfig ? (
                  "Đang xử lý..."
                ) : maintenance ? (
                  <>
                    <Unlock size={13} />
                    <span>Mở hệ thống</span>
                  </>
                ) : (
                  <>
                    <Lock size={13} />
                    <span>Đóng hệ thống (Bảo trì)</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <div className={styles.userLabel}>{user.fullName}</div>
              <div className={styles.userRole}>
                {user.dbRole === "admin" ? "Quản trị viên" : "Nhân viên"}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
