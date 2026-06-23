import { db } from "@/lib/db";
import styles from "./page.module.css";
import AppointmentsManager from "@/components/AppointmentsManager";

export const metadata = {
  title: "Quản lý đặt lịch hẹn - Spa CRM",
};

export const dynamic = "force-dynamic";

export default async function StaffAppointmentsPage() {
  // Fetch customers for the booking dropdown
  const customers = await db.customer.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
    },
  });

  // Fetch only services (treatments) for selection
  const spaServices = await db.service.findMany({
    where: {
      type: "service",
    },
    orderBy: { name: "asc" },
  });

  const formattedServices = spaServices.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
  }));

  // Fetch all appointments
  const appointments = await db.appointment.findMany({
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
      dateTime: "desc",
    },
  });

  const formattedAppointments = appointments.map((appt) => ({
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý lịch hẹn Spa</h1>
          <p className={styles.subtitle}>
            Điều phối, lên lịch và cập nhật trạng thái lịch hẹn trị liệu của khách hàng.
          </p>
        </div>
      </header>

      <AppointmentsManager
        initialAppointments={formattedAppointments}
        customers={customers}
        services={formattedServices}
      />
    </div>
  );
}
