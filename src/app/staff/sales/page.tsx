import { db } from "@/lib/db";
import { getVietnamToday } from "@/lib/timezone";
import styles from "./page.module.css";
import SalesDashboard from "@/components/SalesDashboard";

export const metadata = {
  title: "Bàn làm việc bán hàng & Lịch hẹn - Spa CRM",
};

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const { start: todayStart, end: todayEnd } = getVietnamToday();

  // Parallel fetch database records
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

  const appointmentsPromise = db.appointment.findMany({
    where: {
      dateTime: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
    },
    orderBy: {
      dateTime: "asc",
    },
  });

  const invoicesPromise = db.invoice.findMany({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      customer: {
        select: {
          fullName: true,
          phone: true,
        },
      },
      items: true,
      schedules: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const [customers, services, cardTemplates, staff, appointments, invoices] = await Promise.all([
    customersPromise,
    servicesPromise,
    cardTemplatesPromise,
    staffPromise,
    appointmentsPromise,
    invoicesPromise,
  ]);

  // Safe mappings (convert Decimal or objects to plain numbers/strings)
  const mappedCustomers = customers.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
  }));

  const mappedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    type: s.type,
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

  const mappedAppointments = appointments.map((appt) => ({
    id: appt.id,
    customerId: appt.customerId,
    customer: {
      id: appt.customer.id,
      fullName: appt.customer.fullName,
      phone: appt.customer.phone,
    },
    dateTime: appt.dateTime.toISOString(),
    status: appt.status,
    notes: appt.notes,
  }));

  const mappedInvoices = invoices.map((inv) => ({
    id: inv.id,
    customerId: inv.customerId,
    customer: {
      fullName: inv.customer.fullName,
      phone: inv.customer.phone,
    },
    totalAmount: Number(inv.totalAmount),
    discount: Number(inv.discount),
    finalAmount: Number(inv.finalAmount),
    paymentType: inv.paymentType,
    installmentType: inv.installmentType,
    createdAt: inv.createdAt.toISOString(),
    items: inv.items.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      itemId: item.itemId,
      price: Number(item.price),
      quantity: item.quantity,
      discount: Number(item.discount),
      staffId: item.staffId,
    })),
    schedules: inv.schedules.map((sch) => ({
      amount: Number(sch.amount),
    })),
  }));

  return (
    <div className={styles.container}>
      <header>
        <h1 className={styles.title}>Quầy bán hàng & Điều phối</h1>
      </header>

      <SalesDashboard
        customers={mappedCustomers}
        services={mappedServices}
        cardTemplates={mappedCardTemplates}
        staff={mappedStaff}
        initialAppointments={mappedAppointments}
        initialInvoices={mappedInvoices}
      />
    </div>
  );
}
