import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateTier } from "../customers/route";

// GET all invoices
export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        staff: true,
        items: {
          include: {
            staff: {
              select: {
                fullName: true,
              },
            },
          },
        },
        schedules: true,
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
      if (!installmentMonths || ![6, 9, 12].includes(Number(installmentMonths))) {
        return NextResponse.json({ error: "Kỳ hạn trả góp phải là 6, 9 hoặc 12 tháng" }, { status: 400 });
      }
      if (downPaymentNum >= finalAmountNum) {
        return NextResponse.json({ error: "Số tiền trả trước phải nhỏ hơn tổng số tiền hóa đơn" }, { status: 400 });
      }
    }

    // Execute in a transaction
    const invoiceResult = await db.$transaction(async (tx) => {
      // 1. Check customer existence
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) throw new Error("Khách hàng không tồn tại");

      // 2. Check staff existence
      const staff = await tx.staff.findUnique({
        where: { id: staffId },
      });
      if (!staff) throw new Error("Nhân viên thu ngân không tồn tại");

      // 3. Create core Invoice record
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

      // 4. Process invoice items and grant cards/treatments
      for (const item of items) {
        const itemPrice = Number(item.price);
        const itemQty = Number(item.quantity || 1);
        const itemDiscount = Number(item.discount || 0);

        // Create InvoiceItem with details
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            itemType: item.itemType, // 'service', 'product', or 'card'
            itemId: item.itemId,
            price: itemPrice,
            quantity: itemQty,
            discount: itemDiscount,
            staffId: item.staffId || null,
          },
        });

        // Grant features depending on item type
        if (item.itemType === "card") {
          // Fetch card template to get values
          const template = await tx.cardTemplate.findUnique({
            where: { id: item.itemId },
          });
          if (!template) throw new Error(`Không tìm thấy mẫu thẻ có ID ${item.itemId}`);

          // Create CustomerCard
          await tx.customerCard.create({
            data: {
              customerId,
              templateId: item.itemId,
              originalPrice: template.price,
              originalValue: template.value,
              currentBalance: template.value, // start with full promotional balance
            },
          });
        } else if (item.itemType === "service" || item.itemType === "product") {
          // Fetch service to confirm (both products and services are stored in Service table)
          const service = await tx.service.findUnique({
            where: { id: item.itemId },
          });
          if (!service) throw new Error(`Không tìm thấy dịch vụ/sản phẩm có ID ${item.itemId}`);

          // For services, create treatments package. For products, they are retail only (no sessions to treat)
          if (service.type === "service") {
            const totalSessions = Number(item.totalSessions || itemQty || 1);
            
            // Create CustomerTreatment
            await tx.customerTreatment.create({
              data: {
                customerId,
                serviceId: item.itemId,
                totalSessions,
                usedSessions: 0,
                pricePaid: Math.max((itemPrice * itemQty) - itemDiscount, 0),
              },
            });
          }
        }
      }

      // 5. Generate Installment Schedule if installment
      if (paymentType === "installment") {
        const months = Number(installmentMonths);
        const debtAmount = finalAmountNum - downPaymentNum;
        
        // Calculate monthly split (handling roundings for the last month)
        const baseMonthlyAmount = Math.floor(debtAmount / months);
        let sumCreated = 0;

        for (let i = 1; i <= months; i++) {
          let monthlyAmount = baseMonthlyAmount;
          
          // Last month takes the remainder to make it match perfectly without fractions
          if (i === months) {
            monthlyAmount = debtAmount - sumCreated;
          } else {
            sumCreated += baseMonthlyAmount;
          }

          // Due date is every 30 days from now
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (30 * i));

          await tx.installmentSchedule.create({
            data: {
              invoiceId: invoice.id,
              dueDate,
              amount: monthlyAmount,
              status: "pending",
            },
          });
        }
      }

      // 6. Complete appointment if linked
      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: "completed" },
        });
      }

      // 7. Update customer total spend and tier
      const updatedTotalSpent = Number(customer.totalSpent) + finalAmountNum;
      const newTier = calculateTier(updatedTotalSpent);

      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalSpent: updatedTotalSpent,
          tier: newTier,
        },
      });

      return invoice;
    });

    return NextResponse.json(invoiceResult, { status: 201 });
  } catch (error: any) {
    console.error("POST Invoice Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi tạo hóa đơn" }, { status: 500 });
  }
}
