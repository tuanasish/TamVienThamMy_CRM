import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateTier } from "../../customers/route";

// GET a single invoice
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: true,
        items: true,
        schedules: true,
      },
    });
    
    if (!invoice) {
      return NextResponse.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });
    }
    
    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error("GET Single Invoice Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi lấy thông tin hóa đơn" }, { status: 500 });
  }
}

// PUT to edit invoice details
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      staffId,
      discount = 0,
      paymentType,
      installmentType,
      installmentMonths,
      downPayment = 0,
      bankFee = 0,
      internalNotes,
      items, // array of updated items: { id, discount, staffId }
    } = body;
    
    const updatedInvoice = await db.$transaction(async (tx) => {
      // 1. Fetch invoice + customer in parallel (both needed for calculations)
      const [invoice, customer] = await Promise.all([
        tx.invoice.findUnique({
          where: { id },
          include: { items: true },
        }),
        // We'll get the customer after we have the invoice, but we can start early
        // Actually we need invoice.customerId first, so fetch invoice first
        null,
      ]);
      
      if (!invoice) throw new Error("Hóa đơn không tồn tại");
      
      // Now fetch customer
      const cust = await tx.customer.findUnique({
        where: { id: invoice.customerId },
        select: { id: true, totalSpent: true },
      });
      if (!cust) throw new Error("Khách hàng không tồn tại");
      
      // 2. Update InvoiceItems in PARALLEL (not sequential)
      let itemsTotalDiscount = 0;
      if (items && Array.isArray(items)) {
        const updatePromises = items.map((itm: any) => {
          const matchedItem = invoice.items.find((i) => i.id === itm.id);
          if (matchedItem) {
            const itemDisc = Number(itm.discount || 0);
            itemsTotalDiscount += itemDisc;
            return tx.invoiceItem.update({
              where: { id: itm.id },
              data: {
                discount: itemDisc,
                staff: itm.staffId ? { connect: { id: itm.staffId } } : { disconnect: true },
              },
            });
          }
          return null;
        }).filter(Boolean);
        
        await Promise.all(updatePromises);
      } else {
        itemsTotalDiscount = invoice.items.reduce((sum, i) => sum + Number(i.discount), 0);
      }
      
      // Calculate new total and final amount
      const rawTotal = invoice.items.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0);
      const invoiceDisc = Number(discount);
      const newFinalAmount = Math.max(rawTotal - itemsTotalDiscount - invoiceDisc, 0);
      
      // 3. Update invoice + customer + delete old schedules — ALL IN PARALLEL
      const newTotalSpent = Math.max(0, Number(cust.totalSpent) - Number(invoice.finalAmount) + newFinalAmount);
      const newTier = calculateTier(newTotalSpent);
      
      const [updated] = await Promise.all([
        tx.invoice.update({
          where: { id },
          data: {
            staff: { connect: { id: staffId } },
            discount: invoiceDisc,
            finalAmount: newFinalAmount,
            paymentType,
            installmentType: paymentType === "installment" ? (installmentType || "counter") : null,
            installmentMonths: paymentType === "installment" ? Number(installmentMonths) : null,
            bankFee: paymentType === "installment" ? Number(bankFee) : 0,
            internalNotes: internalNotes || null,
          },
        }),
        tx.customer.update({
          where: { id: cust.id },
          data: { totalSpent: newTotalSpent, tier: newTier },
        }),
        tx.installmentSchedule.deleteMany({
          where: { invoiceId: id },
        }),
      ]);
      
      // 4. Recreate installment schedules with createMany (1 query instead of N)
      if (paymentType === "installment") {
        const months = Number(installmentMonths || 6);
        const debtAmount = newFinalAmount - Number(downPayment);
        const baseMonthlyAmount = Math.floor(debtAmount / months);
        let sumCreated = 0;
        
        const scheduleData = [];
        for (let i = 1; i <= months; i++) {
          let monthlyAmount = baseMonthlyAmount;
          if (i === months) {
            monthlyAmount = debtAmount - sumCreated;
          } else {
            sumCreated += baseMonthlyAmount;
          }
          
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (30 * i));
          
          scheduleData.push({
            invoiceId: id,
            dueDate,
            amount: monthlyAmount,
            status: "pending",
          });
        }
        
        await tx.installmentSchedule.createMany({ data: scheduleData });
      }
      
      return updated;
    });
    
    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (error: any) {
    console.error("PUT Invoice Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi sửa hóa đơn" }, { status: 500 });
  }
}

// DELETE to void/cancel an invoice
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const deletedInvoice = await db.$transaction(async (tx) => {
      // 1. Fetch invoice to get finalAmount and customerId
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
      
      if (!invoice) {
        throw new Error("Không tìm thấy hóa đơn cần xóa");
      }
      
      // 2. Find customer
      const customer = await tx.customer.findUnique({
        where: { id: invoice.customerId },
      });
      if (!customer) throw new Error("Khách hàng không tồn tại");
      
      // 3. Revert customer spent and tier
      const newTotalSpent = Math.max(0, Number(customer.totalSpent) - Number(invoice.finalAmount));
      const newTier = calculateTier(newTotalSpent);
      
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: newTotalSpent,
          tier: newTier,
        },
      });
      
      // 4. Revert cards and treatments generated by this invoice
      const dateMin = new Date(invoice.createdAt.getTime() - 10000);
      const dateMax = new Date(invoice.createdAt.getTime() + 10000);
      
      for (const item of invoice.items) {
        if (item.itemType === "card") {
          await tx.customerCard.deleteMany({
            where: {
              customerId: invoice.customerId,
              templateId: item.itemId,
              createdAt: {
                gte: dateMin,
                lte: dateMax,
              },
            },
          });
        } else if (item.itemType === "service") {
          await tx.customerTreatment.deleteMany({
            where: {
              customerId: invoice.customerId,
              serviceId: item.itemId,
              createdAt: {
                gte: dateMin,
                lte: dateMax,
              },
            },
          });
        }
      }
      
      // 5. Delete invoice (cascade handles InvoiceItem and InstallmentSchedule deletion)
      const deleted = await tx.invoice.delete({
        where: { id },
      });
      
      return deleted;
    });
    
    return NextResponse.json({ success: true, invoice: deletedInvoice });
  } catch (error: any) {
    console.error("DELETE Invoice Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi xóa hóa đơn" }, { status: 500 });
  }
}
