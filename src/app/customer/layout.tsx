import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getMaintenanceStatus } from "@/lib/systemConfig";
import CustomerHeader from "@/components/CustomerHeader";
import CustomerBottomNav from "@/components/CustomerBottomNav";
import styles from "./layout.module.css";

export const metadata = {
  title: "Cổng tra cứu khách hàng - L'Amour Spa",
};

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check maintenance status first
  if (getMaintenanceStatus()) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at top right, #1a1510, #0c0a07)",
        color: "#f5f5f7",
        padding: "2rem",
        textAlign: "center",
      }}>
        <div style={{
          background: "rgba(197, 160, 89, 0.05)",
          border: "1px solid rgba(197, 160, 89, 0.2)",
          borderRadius: "24px",
          padding: "3rem 2rem",
          maxWidth: "480px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{
            fontSize: "4.5rem",
            fontWeight: 900,
            color: "#c5a059",
            letterSpacing: "0.1em",
            textShadow: "0 0 20px rgba(197, 160, 89, 0.2)",
            lineHeight: 1
          }}>
            404
          </div>
          <div style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "#f5f5f7",
            marginTop: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            Hệ thống đang bảo trì
          </div>
          <div style={{
            width: "50px",
            height: "2px",
            background: "linear-gradient(90deg, transparent, #c5a059, transparent)",
            margin: "1.5rem auto"
          }} />
          <p style={{
            fontSize: "0.9rem",
            color: "#a1a1a6",
            lineHeight: 1.6,
            marginBottom: "2rem"
          }}>
            Để nâng cấp chất lượng dịch vụ chăm sóc khách hàng được tốt hơn, hệ thống cổng tra cứu của Spa đang được bảo trì định kỳ. Quý khách vui lòng quay lại sau ít phút. Xin cảm ơn sự thông cảm của quý khách!
          </p>
          <div style={{
            fontSize: "0.8rem",
            color: "#6e6e73"
          }}>
            Hotline hỗ trợ khách hàng: <strong style={{ color: "#c5a059" }}>1800 6888</strong>
          </div>
        </div>
      </div>
    );
  }

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
      <CustomerBottomNav />
    </div>
  );
}
