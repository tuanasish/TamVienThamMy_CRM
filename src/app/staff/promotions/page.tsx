import { db } from "@/lib/db";
import styles from "./page.module.css";
import PromotionDashboard from "./PromotionDashboard";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  // Query all promotions from DB
  const promotions = await db.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Query all registrations from DB
  const registrations = await db.promotionRegistration.findMany({
    include: {
      promotion: {
        select: { title: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to plain objects for safe client rendering
  const mappedPromotions = promotions.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    image: p.image,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  }));

  const mappedRegistrations = registrations.map((r) => ({
    id: r.id,
    promotionId: r.promotionId,
    promotionTitle: r.promotion.title,
    customerPhone: r.customerPhone,
    customerName: r.customerName,
    notes: r.notes,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Ưu đãi &amp; Leads tư vấn</h1>
          <p className={styles.subtitle}>Tạo mới ưu đãi hiển thị trên cổng Khách hàng và liên hệ tư vấn giữ suất</p>
        </div>
      </header>

      <PromotionDashboard
        initialPromotions={mappedPromotions}
        initialRegistrations={mappedRegistrations}
      />
    </div>
  );
}
