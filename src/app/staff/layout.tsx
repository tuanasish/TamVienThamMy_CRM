import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StaffSidebar from "@/components/StaffSidebar";
import styles from "./layout.module.css";
import { db } from "@/lib/db";

export const metadata = {
  title: "Bàn làm việc - Spa CRM",
};

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("spa_crm_session");

  if (!sessionCookie) {
    redirect("/login?role=staff");
  }

  let user: { id: string; fullName: string; role: string; dbRole: string; permissions?: string[] } = {
    id: "",
    fullName: "Nhân viên Spa",
    role: "staff",
    dbRole: "staff",
    permissions: []
  };
  try {
    const parsed = JSON.parse(sessionCookie.value);
    if (parsed.role !== "staff") {
      redirect("/login?role=staff");
    }

    // Query DB to get up-to-date live role
    const dbStaff = await db.staff.findUnique({
      where: { id: parsed.id },
      select: { role: true, fullName: true, username: true, permissions: true }
    });

    if (!dbStaff) {
      // Account deleted
      redirect("/login?role=staff");
    }

    user = {
      id: parsed.id,
      fullName: dbStaff.fullName,
      role: parsed.role,
      dbRole: dbStaff.role,
      permissions: dbStaff.permissions
    };
  } catch (e) {
    redirect("/login?role=staff");
  }

  return (
    <div className={styles.container}>
      <StaffSidebar user={user} />
      <div className={styles.mainContent}>{children}</div>
    </div>
  );
}
