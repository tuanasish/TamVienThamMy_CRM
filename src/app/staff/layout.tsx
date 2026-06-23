import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StaffSidebar from "@/components/StaffSidebar";
import styles from "./layout.module.css";

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

  let user = { fullName: "Nhân viên Spa", role: "staff" };
  try {
    const parsed = JSON.parse(sessionCookie.value);
    if (parsed.role !== "staff") {
      redirect("/login?role=staff");
    }
    user = parsed;
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
