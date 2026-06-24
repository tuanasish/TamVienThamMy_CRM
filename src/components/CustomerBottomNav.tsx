"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, Award, Wallet, Activity } from "lucide-react";
import styles from "@/app/customer/layout.module.css";

export default function CustomerBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Trang chủ", path: "/customer", icon: <Home size={18} /> },
    { name: "Khuyến mãi", path: "/customer#promotions", icon: <Tag size={18} /> },
    { name: "Tích điểm", path: "/customer#points", icon: <Award size={18} /> },
    { name: "Dịch vụ", path: "/customer#services", icon: <Wallet size={18} /> },
    { name: "Lịch sử", path: "/customer#history", icon: <Activity size={18} /> },
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.name}
            href={item.path}
            className={`${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ""}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
