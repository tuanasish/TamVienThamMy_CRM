import { db } from "@/lib/db";
import SpaConfigTabs from "@/components/SpaConfigTabs";
import styles from "./page.module.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("spa_crm_session");
  if (!sessionCookie) redirect("/login?role=staff");

  let parsed;
  try {
    parsed = JSON.parse(sessionCookie.value);
  } catch (e) {
    redirect("/login?role=staff");
  }

  const dbStaff = await db.staff.findUnique({
    where: { id: parsed.id },
    select: { role: true }
  });

  const userRole = dbStaff?.role || "staff";

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
    notes: s.notes || "",
    sessions: s.tags && typeof s.tags === "object" && s.tags !== null && "sessions" in s.tags ? Number((s.tags as any).sessions) : 1,
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
      <h1 className={styles.title}>Dịch vụ</h1>
      <SpaConfigTabs 
        initialServices={formattedServices} 
        initialTemplates={formattedTemplates} 
        userRole={userRole}
      />
    </div>
  );
}
