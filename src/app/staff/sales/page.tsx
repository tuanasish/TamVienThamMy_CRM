import { db } from "@/lib/db";
import { getVietnamToday, getVietnamDateString, getVietnamDayRange } from "@/lib/timezone";
import styles from "./page.module.css";
import SalesDashboard from "@/components/SalesDashboard";

export const metadata = {
  title: "Quầy bán hàng & Điều phối - Spa CRM",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "today";
  const startDateParam = resolvedParams.startDate;
  const endDateParam = resolvedParams.endDate;

  let startRange: Date;
  let endRange: Date;

  // Calculate Vietnam local time boundaries, then convert to UTC Date objects for Prisma queries
  if (filter === "today") {
    const today = getVietnamToday();
    startRange = today.start;
    endRange = today.end;
  } else if (filter === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getVietnamDateString(yesterday);
    const range = getVietnamDayRange(yesterdayStr);
    startRange = range.start;
    endRange = range.end;
  } else if (filter === "7days") {
    const todayStr = getVietnamDateString();
    endRange = getVietnamDayRange(todayStr).end;

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 6);
    const pastDateStr = getVietnamDateString(pastDate);
    startRange = getVietnamDayRange(pastDateStr).start;
  } else if (filter === "month") {
    const todayStr = getVietnamDateString();
    const parts = todayStr.split("-");
    const year = parts[0];
    const month = parts[1];
    startRange = new Date(`${year}-${month}-01T00:00:00+07:00`);
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    endRange = new Date(`${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59.999+07:00`);
  } else if (filter === "custom" && startDateParam && endDateParam) {
    startRange = new Date(`${startDateParam}T00:00:00+07:00`);
    endRange = new Date(`${endDateParam}T23:59:59.999+07:00`);
  } else {
    // Default fallback to today
    const today = getVietnamToday();
    startRange = today.start;
    endRange = today.end;
  }

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



  const invoicesPromise = db.invoice.findMany({
    where: {
      createdAt: {
        gte: startRange,
        lte: endRange,
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

  const usageLogsPromise = db.usageLog.findMany({
    where: {
      usedAt: {
        gte: startRange,
        lte: endRange,
      },
    },
    include: {
      customer: {
        select: {
          fullName: true,
          phone: true,
        },
      },
      service: {
        select: {
          name: true,
        },
      },
      staff: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: {
      usedAt: "desc",
    },
  });

  const [customers, services, cardTemplates, staff, invoices, usageLogs] = await Promise.all([
    customersPromise,
    servicesPromise,
    cardTemplatesPromise,
    staffPromise,
    invoicesPromise,
    usageLogsPromise,
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
    sessions: s.tags && typeof s.tags === "object" && s.tags !== null && "sessions" in s.tags ? Number((s.tags as any).sessions) : 1,
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
    installmentMonths: inv.installmentMonths,
    paidAmountCash: Number(inv.paidAmountCash),
    paidAmountTransfer: Number(inv.paidAmountTransfer),
    paidAmountHomeCredit: Number(inv.paidAmountHomeCredit),
    paidAmountMiraeAsset: Number(inv.paidAmountMiraeAsset),
    paidAmountDebt: Number(inv.paidAmountDebt),
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

  const mappedUsageLogs = usageLogs.map((log) => ({
    id: log.id,
    customerId: log.customerId,
    customerName: log.customer.fullName,
    customerPhone: log.customer.phone,
    serviceName: log.service.name,
    sourceType: log.sourceType,
    amountDeducted: Number(log.amountDeducted),
    sessionsDeducted: log.sessionsDeducted,
    performedBy: log.performedBy,
    usedAt: log.usedAt.toISOString(),
    notes: log.notes,
    staffName: log.staff?.fullName || "Hệ thống",
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
        initialInvoices={mappedInvoices}
        initialUsageLogs={mappedUsageLogs}
        activeFilter={filter}
        startDate={startDateParam || startRange.toLocaleDateString("sv-SE")}
        endDate={endDateParam || endRange.toLocaleDateString("sv-SE")}
      />
    </div>
  );
}
