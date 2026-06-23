import { db } from "@/lib/db";
import StaffServicesCrud from "@/components/StaffServicesCrud";
import styles from "../config/page.module.css";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await db.service.findMany({
    orderBy: { name: "asc" },
  });

  // Format database types for safety
  const formattedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    tags: Array.isArray(s.tags) ? (s.tags as string[]) : JSON.parse((s.tags as string) || "[]"),
  }));

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Danh mục dịch vụ Spa</h1>
      <StaffServicesCrud initialServices={formattedServices} />
    </div>
  );
}
