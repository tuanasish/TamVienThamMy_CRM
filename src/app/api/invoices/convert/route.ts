import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateTier } from "../../customers/route";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      staffId,
      revokeCardIds = [],
      revokeTreatmentIds = [],
      newItems = [],
      discount = 0,
      totalAmount,
      finalAmount,
      paidAmountOffset = 0,
      paidAmountCash = 0,
      paidAmountTransfer = 0,
      paidAmountHomeCredit = 0,
      paidAmountMiraeAsset = 0,
      paidAmountDebt = 0,
      installmentMonths,
      bankFee = 0,
      internalNotes,
      performedBy = "Hệ thống",
    } = body;

    if (!customerId || !staffId) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ các thông tin bắt buộc" }, { status: 400 });
    }

    // Execute in a transaction
    const invoiceResult = await db.$transaction(async (tx) => {
      // 1. Fetch customer and staff
      const [customer, staff, fallbackService] = await Promise.all([
        tx.customer.findUnique({
          where: { id: customerId },
          select: { id: true, totalSpent: true },
        }),
        tx.staff.findUnique({
          where: { id: staffId },
          select: { id: true, fullName: true },
        }),
        tx.service.findFirst({
          select: { id: true },
        }),
      ]);

      if (!customer) throw new Error("Khách hàng không tồn tại");
      if (!staff) throw new Error("Nhân viên không tồn tại");
      if (!fallbackService) throw new Error("Hệ thống chưa có dịch vụ nào để ghi nhận nhật ký");

      // 2. Revoke and log selected CustomerCards
      for (const cardId of revokeCardIds) {
        const card = await tx.customerCard.findUnique({
          where: { id: cardId },
          include: { template: true },
        });
        if (!card) throw new Error(`Không tìm thấy thẻ tài khoản có ID ${cardId}`);
        if (card.customerId !== customerId) throw new Error(`Thẻ tài khoản ${cardId} không thuộc về khách hàng này`);

        const curBal = Number(card.currentBalance);
        if (curBal > 0) {
          // Set current balance to 0
          await tx.customerCard.update({
            where: { id: cardId },
            data: { currentBalance: 0 },
          });

          // Log deactivation
          await tx.usageLog.create({
            data: {
              customerId,
              serviceId: fallbackService.id,
              sourceType: "card",
              cardId: cardId,
              amountDeducted: curBal,
              sessionsDeducted: 0,
              performedBy: performedBy,
              notes: `[Thu hồi chuyển đổi] Thu hồi số dư ${curBal.toLocaleString("vi-VN")}đ để cấn trừ sang đơn hàng mới.`,
              staffId: staffId,
            },
          });
        }
      }

      // 3. Revoke and log selected CustomerTreatments
      for (const tId of revokeTreatmentIds) {
        const treatment = await tx.customerTreatment.findUnique({
          where: { id: tId },
          include: { service: true },
        });
        if (!treatment) throw new Error(`Không tìm thấy gói liệu trình có ID ${tId}`);
        if (treatment.customerId !== customerId) throw new Error(`Gói liệu trình ${tId} không thuộc về khách hàng này`);

        const remainingSessions = treatment.totalSessions - treatment.usedSessions;
        if (remainingSessions > 0) {
          // Set used sessions to total sessions
          await tx.customerTreatment.update({
            where: { id: tId },
            data: { usedSessions: treatment.totalSessions },
          });

          // Log deactivation
          await tx.usageLog.create({
            data: {
              customerId,
              serviceId: treatment.serviceId,
              sourceType: "treatment",
              treatmentId: tId,
              amountDeducted: 0,
              sessionsDeducted: remainingSessions,
              performedBy: performedBy,
              notes: `[Thu hồi chuyển đổi] Thu hồi ${remainingSessions} buổi liệu trình còn lại để cấn trừ sang đơn hàng mới.`,
              staffId: staffId,
            },
          });
        }
      }

      // 4. Create core Invoice record
      const finalAmt = Number(finalAmount);
      const bankFeeNum = Number(bankFee);
      const paidOffsetNum = Number(paidAmountOffset || 0);

      const paidCash = Number(paidAmountCash || 0);
      const paidTransfer = Number(paidAmountTransfer || 0);
      const paidHomeCredit = Number(paidAmountHomeCredit || 0);
      const paidMiraeAsset = Number(paidAmountMiraeAsset || 0);
      const paidDebt = Number(paidAmountDebt || 0);

      const calculatedPaymentType = (paidDebt > 0 || paidHomeCredit > 0 || paidMiraeAsset > 0) ? "installment" : "cash";
      const calculatedInstallmentType = paidDebt > 0 ? "counter" : (paidHomeCredit > 0 ? "home_credit" : (paidMiraeAsset > 0 ? "mirae_asset" : null));

      if (paidDebt > 0) {
        if (!installmentMonths || ![1, 3, 6, 9, 12].includes(Number(installmentMonths))) {
          throw new Error("Kỳ hạn trả nợ/trả góp phải là 1, 3, 6, 9 hoặc 12 tháng");
        }
      }

      const invoice = await tx.invoice.create({
        data: {
          customerId,
          staffId,
          totalAmount: Number(totalAmount),
          discount: Number(discount),
          finalAmount: finalAmt,
          paymentType: calculatedPaymentType,
          installmentType: calculatedInstallmentType,
          installmentMonths: (paidDebt > 0 || paidHomeCredit > 0 || paidMiraeAsset > 0) ? Number(installmentMonths) : null,
          bankFee: bankFeeNum,
          paidAmountCash: paidCash,
          paidAmountTransfer: paidTransfer,
          paidAmountHomeCredit: paidHomeCredit,
          paidAmountMiraeAsset: paidMiraeAsset,
          paidAmountDebt: paidDebt,
          paidAmountOffset: paidOffsetNum,
          internalNotes: internalNotes || null,
        },
      });

      // 5. Create new items and grant new features
      const itemCreatePromises = [];
      const grantPromises: Promise<any>[] = [];

      for (const item of newItems) {
        const itemPrice = Number(item.price);
        const itemQty = Number(item.quantity || 1);
        const itemDiscount = Number(item.discount || 0);

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

      await Promise.all([...itemCreatePromises, ...grantPromises]);

      // 6. Generate installment schedules
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
        await tx.installmentSchedule.createMany({ data: scheduleData });
      }

      // 7. Update customer total spend and tier (only count net new money to prevent double spend calculations)
      const netNewSpent = Math.max(0, finalAmt - paidOffsetNum);
      const updatedTotalSpent = Number(customer.totalSpent) + netNewSpent;
      const newTier = calculateTier(updatedTotalSpent);

      await tx.customer.update({
        where: { id: customerId },
        data: { totalSpent: updatedTotalSpent, tier: newTier },
      });

      return invoice;
    });

    return NextResponse.json(invoiceResult, { status: 201 });
  } catch (error: any) {
    console.error("POST Convert Package Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi chuyển đổi gói" }, { status: 500 });
  }
}
