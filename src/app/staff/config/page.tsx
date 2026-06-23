import { db } from "@/lib/db";
import SpaConfigTabs from "@/components/SpaConfigTabs";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const services = await db.service.findMany({
    orderBy: { createdAt: "desc" },
  });

  const templates = await db.cardTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Map database structures to matching types
  const formattedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    type: s.type,
    tags: Array.isArray(s.tags) ? (s.tags as string[]) : JSON.parse((s.tags as string) || "[]"),
  }));

  const formattedTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    price: Number(t.price),
    value: Number(t.value),
    services: Array.isArray(t.services) ? (t.services as string[]) : JSON.parse((t.services as string) || "[]"),
  }));

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Cấu hình spa</h1>
      <SpaConfigTabs 
        initialServices={formattedServices} 
        initialTemplates={formattedTemplates} 
      />
    </div>
  );
}
