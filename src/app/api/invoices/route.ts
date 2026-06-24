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
      paidAmountCash = 0,
      paidAmountTransfer = 0,
      paidAmountHomeCredit = 0,
      paidAmountMiraeAsset = 0,
      paidAmountDebt = 0,
      paidAmountOffset = 0,
      internalNotes,
      items, // array of items: { itemType, itemId, price, quantity, discount, staffId }
      appointmentId, // optional appointment link
    } = body;

    // Validate inputs
    if (!customerId || !staffId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ các thông tin hóa đơn bắt buộc" }, { status: 400 });
    }

    if (finalAmount === undefined || finalAmount < 0) {
      return NextResponse.json({ error: "Số tiền thanh toán cuối cùng không hợp lệ" }, { status: 400 });
    }

    const finalAmountNum = Number(finalAmount);
    const bankFeeNum = Number(bankFee);
    const paidOffset = Number(paidAmountOffset || 0);

    let paidCash = Number(paidAmountCash || 0);
    let paidTransfer = Number(paidAmountTransfer || 0);
    let paidHomeCredit = Number(paidAmountHomeCredit || 0);
    let paidMiraeAsset = Number(paidAmountMiraeAsset || 0);
    let paidDebt = Number(paidAmountDebt || 0);

    const sumSplit = paidCash + paidTransfer + paidHomeCredit + paidMiraeAsset + paidDebt + paidOffset;
    if (sumSplit === 0) {
      if (paymentType === "cash") {
        paidCash = finalAmountNum;
      } else {
        const downPaymentNum = Number(downPayment || 0);
        paidCash = downPaymentNum;
        const remaining = finalAmountNum - downPaymentNum;
        if (installmentType === "home_credit") {
          paidHomeCredit = remaining;
        } else if (installmentType === "mirae_asset") {
          paidMiraeAsset = remaining;
        } else {
          paidDebt = remaining;
        }
      }
    }

    const calculatedPaymentType = (paidDebt > 0 || paidHomeCredit > 0 || paidMiraeAsset > 0) ? "installment" : "cash";
    const calculatedInstallmentType = paidDebt > 0 ? "counter" : (paidHomeCredit > 0 ? "home_credit" : (paidMiraeAsset > 0 ? "mirae_asset" : null));

    // Validate installment details
    if (paidDebt > 0) {
      if (!installmentMonths || ![1, 3, 6, 9, 12].includes(Number(installmentMonths))) {
        return NextResponse.json({ error: "Kỳ hạn trả nợ/trả góp phải là 1, 3, 6, 9 hoặc 12 tháng" }, { status: 400 });
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
          paymentType: calculatedPaymentType,
          installmentType: calculatedInstallmentType,
          installmentMonths: (paidDebt > 0 || paidHomeCredit > 0 || paidMiraeAsset > 0) ? Number(installmentMonths) : null,
          bankFee: bankFeeNum,
          paidAmountCash: paidCash,
          paidAmountTransfer: paidTransfer,
          paidAmountHomeCredit: paidHomeCredit,
          paidAmountMiraeAsset: paidMiraeAsset,
          paidAmountDebt: paidDebt,
          paidAmountOffset: paidOffset,
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

      if (paidDebt > 0) {
        const months = Number(installmentMonths || 1);
        const debtAmount = paidDebt;
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
      const netNewSpent = Math.max(0, finalAmountNum - paidOffset);
      const updatedTotalSpent = Number(customer.totalSpent) + netNewSpent;
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
