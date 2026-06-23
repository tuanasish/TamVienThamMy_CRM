import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import styles from "./page.module.css";
import BookingForm from "@/components/BookingForm";

export const metadata = {
  title: "Đặt lịch hẹn trực tuyến - L'Amour Spa",
};

export const dynamic = "force-dynamic";

export default async function BookingPage() {
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

  // Verify customer in database
  const customer = await db.customer.findUnique({
    where: { id: sessionUser.id },
  });

  if (!customer) {
    redirect("/login?role=customer");
  }

  // Fetch all active spa services for selection
  const spaServices = await db.service.findMany({
    where: {
      type: "service" // Only treatments can be booked as appointments, products are retail only
    },
    orderBy: { name: "asc" },
  });

  const formattedServices = spaServices.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Đặt lịch hẹn mới</h1>
        <p className={styles.subtitle}>
          Vui lòng chọn dịch vụ và thời gian mong muốn. Nhân viên của chúng tôi sẽ sẵn sàng tiếp đón bạn.
        </p>
      </header>

      <BookingForm customerId={customer.id} services={formattedServices} />
    </div>
  );
}
