import { db } from "@/lib/db";
import styles from "./page.module.css";
import CreateInvoiceForm from "@/components/CreateInvoiceForm";

export const metadata = {
  title: "Tạo hóa đơn bán hàng - Spa CRM",
};

export default async function SalesPage() {
  // Parallel fetch DB lists
  const customersPromise = db.customer.findMany({
    orderBy: { fullName: "asc" },
  });
  
  const servicesPromise = db.service.findMany({
    orderBy: { name: "asc" },
  });

  const cardTemplatesPromise = db.cardTemplate.findMany({
    orderBy: { price: "asc" },
  });

  const staffPromise = db.staff.findMany({
    orderBy: { fullName: "asc" },
  });

  const [customers, services, cardTemplates, staff] = await Promise.all([
    customersPromise,
    servicesPromise,
    cardTemplatesPromise,
    staffPromise,
  ]);

  // Map to simple JSON structures to pass to client component safely (avoid Decimal object issues)
  const mappedCustomers = customers.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
  }));

  const mappedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
  }));

  const mappedCardTemplates = cardTemplates.map((c) => ({
    id: c.id,
    name: c.name,
    price: Number(c.price),
    value: Number(c.value),
  }));

  const mappedStaff = staff.map((st) => ({
    id: st.id,
    fullName: st.fullName,
  }));

  return (
    <div className={styles.container}>
      <header>
        <h1 className={styles.title}>Lập hóa đơn bán hàng mới</h1>
      </header>

      <section>
        <CreateInvoiceForm
          customers={mappedCustomers}
          services={mappedServices}
          cardTemplates={mappedCardTemplates}
          staff={mappedStaff}
        />
      </section>
    </div>
  );
}
