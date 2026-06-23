import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import CustomerHeader from "@/components/CustomerHeader";
import styles from "./layout.module.css";

export const metadata = {
  title: "Cổng tra cứu khách hàng - L'Amour Spa",
};

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("spa_crm_session");

  if (!sessionCookie) {
    redirect("/login?role=customer");
  }

  let sessionUser;
  try {
    sessionUser = JSON.parse(sessionCookie.value);
    if (sessionUser.role !== "customer") {
      redirect("/login?role=customer");
    }
  } catch (e) {
    redirect("/login?role=customer");
  }

  // Fetch fresh customer details from DB
  const customer = await db.customer.findUnique({
    where: { id: sessionUser.id },
  });

  if (!customer) {
    redirect("/login?role=customer");
  }

  const userProp = {
    fullName: customer.fullName,
    phone: customer.phone,
    tier: customer.tier,
  };

  return (
    <div className={styles.container}>
      <CustomerHeader user={userProp} />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
