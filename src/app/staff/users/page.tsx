import { db } from "@/lib/db";
import styles from "./page.module.css";
import AddStaffModal from "@/components/AddStaffModal";
import DeleteStaffButton from "@/components/DeleteStaffButton";
import { Search, ShieldAlert, User, ShieldCheck } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quản lý nhân viên - Spa CRM",
};

export default async function StaffPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q || "";

  // Query staff from DB
  const staffList = await db.staff.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý nhân viên</h1>
          <p className={styles.subtitle} style={{ color: "var(--text-secondary)", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
            Quản lý tài khoản đăng nhập và phân quyền nhân viên trên hệ thống
          </p>
        </div>
        <AddStaffModal />
      </header>

      {/* Search Bar */}
      <form method="GET" action="/staff/users" className={styles.searchBar} id="staff-search-form">
        <input
          name="q"
          type="text"
          className={styles.searchInput}
          placeholder="Tìm tên hoặc tên tài khoản..."
          defaultValue={q}
          id="staff-search-input"
        />
        <button type="submit" className={styles.searchBtn} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} id="staff-search-submit">
          <Search size={16} />
          <span>Tìm kiếm</span>
        </button>
      </form>

      {/* Staff Table */}
      <div className={styles.tableContainer}>
        {staffList.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Không tìm thấy nhân viên nào phù hợp.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nhân viên</th>
                <th className={styles.th}>Tên tài khoản</th>
                <th className={styles.th}>Vai trò</th>
                <th className={styles.th}>Ngày tạo</th>
                <th className={styles.th}>Mã định danh</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => {
                const isAdmin = staff.role === "admin";
                return (
                  <tr key={staff.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {isAdmin ? (
                          <ShieldCheck size={18} style={{ color: "var(--accent-gold)" }} />
                        ) : (
                          <User size={18} style={{ color: "var(--text-secondary)" }} />
                        )}
                        <span>{staff.fullName}</span>
                      </div>
                    </td>
                    <td className={styles.td} style={{ fontFamily: "monospace", color: "var(--accent-gold)" }}>
                      {staff.username}
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${isAdmin ? styles.badgeVIPPlus : styles.badgeNormal}`}>
                        {isAdmin ? "Quản trị viên" : "Nhân viên"}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {new Date(staff.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className={styles.td} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                      {staff.id.substring(0, 8)}...
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <DeleteStaffButton staffId={staff.id} staffName={staff.fullName} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
