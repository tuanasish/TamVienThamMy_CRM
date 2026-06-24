import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateTier } from "../customers/route";

// GET all invoices
export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerId: true,
        staffId: true,
        totalAmount: true,
        discount: true,
        finalAmount: true,
        paymentType: true,
        installmentType: true,
        installmentMonths: true,
        bankFee: true,
        internalNotes: true,
        createdAt: true,
        customer: {
          select: { id: true, fullName: true, phone: true, tier: true },
        },
        staff: {
          select: { id: true, fullName: true },
        },
        items: {
          select: {
            id: true,
            itemType: true,
            itemId: true,
            price: true,
            quantity: true,
            discount: true,
            staffId: true,
            staff: { select: { fullName: true } },
          },
        },
        schedules: {
          select: {
            id: true,
            dueDate: true,
            amount: true,
            status: true,
            paidAt: true,
          },
        },
      },
    });
    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("GET Invoices Error:", error);
    return NextResponse.json({ error: "Không thể lấy danh sách hóa đơn" }, { status: 500 });
  }
}

// POST create invoice
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      staffId, // Main cashier staff
      totalAmount,
      discount = 0, // Invoice-level overall discount
      finalAmount,
      paymentType,
      installmentType,
      installmentMonths,
      downPayment = 0,
      bankFee = 0,
      internalNotes,
      items, // array of items: { itemType, itemId, price, quantity, discount, staffId }
      appointmentId, // optional appointment link
    } = body;

    // Validate inputs
    if (!customerId || !staffId || !paymentType || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ các thông tin hóa đơn bắt buộc" }, { status: 400 });
    }

    if (finalAmount === undefined || finalAmount < 0) {
      return NextResponse.json({ error: "Số tiền thanh toán cuối cùng không hợp lệ" }, { status: 400 });
    }

    const finalAmountNum = Number(finalAmount);
    const downPaymentNum = Number(downPayment);
    const bankFeeNum = Number(bankFee);

    // Validate installment details
    if (paymentType === "installment") {
      if (!installmentMonths || ![1, 3, 6, 9, 12].includes(Number(installmentMonths))) {
        return NextResponse.json({ error: "Kỳ hạn trả nợ/trả góp phải là 1, 3, 6, 9 hoặc 12 tháng" }, { status: 400 });
      }
      if (downPaymentNum >= finalAmountNum) {
        return NextResponse.json({ error: "Số tiền thanh toán phải nhỏ hơn tổng số tiền hóa đơn để ghi nhận công nợ" }, { status: 400 });
      }
    }

    // Execute in a transaction
    const invoiceResult = await db.$transaction(async (tx) => {
      // 1. Validate customer + staff in PARALLEL
      const [customer, staff] = await Promise.all([
        tx.customer.findUnique({
          where: { id: customerId },
          select: { id: true, totalSpent: true },
        }),
        tx.staff.findUnique({
          where: { id: staffId },
          select: { id: true },
        }),
      ]);
      if (!customer) throw new Error("Khách hàng không tồn tại");
      if (!staff) throw new Error("Nhân viên thu ngân không tồn tại");

      // 2. Create core Invoice record
      const invoice = await tx.invoice.create({
        data: {
          customerId,
          staffId,
          totalAmount: Number(totalAmount),
          discount: Number(discount),
          finalAmount: finalAmountNum,
          paymentType,
          installmentType: paymentType === "installment" ? (installmentType || "counter") : null,
          installmentMonths: paymentType === "installment" ? Number(installmentMonths) : null,
          bankFee: bankFeeNum,
          internalNotes: internalNotes || null,
        },
      });

      // 3. Process invoice items — batch create items + grant cards/treatments in PARALLEL
      const itemCreatePromises = [];
      const grantPromises: Promise<any>[] = [];

      for (const item of items) {
        const itemPrice = Number(item.price);
        const itemQty = Number(item.quantity || 1);
        const itemDiscount = Number(item.discount || 0);

        // Create InvoiceItem
        itemCreatePromises.push(
          tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              itemType: item.itemType,
              itemId: item.itemId,
              price: itemPrice,
              quantity: itemQty,
              discount: itemDiscount,
              staffId: item.staffId || null,
              saleStaffIds: item.saleStaffIds || [],
            },
          })
        );

        // Grant features depending on item type
        if (item.itemType === "card") {
          grantPromises.push(
            tx.cardTemplate.findUnique({
              where: { id: item.itemId },
              select: { price: true, value: true },
            }).then((template) => {
              if (!template) throw new Error(`Không tìm thấy mẫu thẻ có ID ${item.itemId}`);
              return tx.customerCard.create({
                data: {
                  customerId,
                  templateId: item.itemId,
                  originalPrice: template.price,
                  originalValue: template.value,
                  currentBalance: template.value,
                },
              });
            })
          );
        } else if (item.itemType === "service" || item.itemType === "product") {
          grantPromises.push(
            tx.service.findUnique({
              where: { id: item.itemId },
              select: { id: true, type: true },
            }).then((service) => {
              if (!service) throw new Error(`Không tìm thấy dịch vụ/sản phẩm có ID ${item.itemId}`);
              if (service.type === "service") {
                const totalSessions = Number(item.totalSessions || itemQty || 1);
                return tx.customerTreatment.create({
                  data: {
                    customerId,
                    serviceId: item.itemId,
                    totalSessions,
                    usedSessions: 0,
                    pricePaid: Math.max((itemPrice * itemQty) - itemDiscount, 0),
                  },
                });
              }
            })
          );
        }
      }

      // Run all item creates + grants in PARALLEL
      await Promise.all([...itemCreatePromises, ...grantPromises]);

      // 4. Generate installment schedules with createMany (1 query) + update customer + appointment — ALL PARALLEL
      const finalPromises: Promise<any>[] = [];

      if (paymentType === "installment") {
        const months = Number(installmentMonths);
        const debtAmount = finalAmountNum - downPaymentNum;
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
            invoiceId: invoice.id,
            dueDate,
            amount: monthlyAmount,
            status: "pending",
          });
        }
        finalPromises.push(tx.installmentSchedule.createMany({ data: scheduleData }));
      }

      // Complete appointment if linked
      if (appointmentId) {
        finalPromises.push(
          tx.appointment.update({
            where: { id: appointmentId },
            data: { status: "completed" },
          })
        );
      }

      // Update customer total spend and tier
      const updatedTotalSpent = Number(customer.totalSpent) + finalAmountNum;
      const newTier = calculateTier(updatedTotalSpent);
      finalPromises.push(
        tx.customer.update({
          where: { id: customerId },
          data: { totalSpent: updatedTotalSpent, tier: newTier },
        })
      );

      await Promise.all(finalPromises);

      return invoice;
    });

    return NextResponse.json(invoiceResult, { status: 201 });
  } catch (error: any) {
    console.error("POST Invoice Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi tạo hóa đơn" }, { status: 500 });
  }
}
