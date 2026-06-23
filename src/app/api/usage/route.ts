import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET usage logs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    const logs = await db.usageLog.findMany({
      where: customerId ? { customerId } : {},
      orderBy: { usedAt: "desc" },
      select: {
        id: true,
        customerId: true,
        serviceId: true,
        sourceType: true,
        cardId: true,
        treatmentId: true,
        amountDeducted: true,
        sessionsDeducted: true,
        performedBy: true,
        usedAt: true,
        notes: true,
        staffId: true,
        customer: { select: { id: true, fullName: true, phone: true } },
        service: { select: { id: true, name: true, price: true } },
        staff: { select: { id: true, fullName: true } },
        customerCard: {
          select: {
            id: true,
            currentBalance: true,
            template: { select: { name: true, value: true } },
          },
        },
        customerTreatment: {
          select: {
            id: true,
            totalSessions: true,
            usedSessions: true,
            service: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("GET Usage Logs Error:", error);
    return NextResponse.json({ error: "Không thể lấy nhật ký sử dụng" }, { status: 500 });
  }
}

// POST log service usage (quẹt thẻ / trừ liệu trình)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      serviceId,
      sourceType, // 'card' or 'treatment'
      sourceId, // ID of CustomerCard or CustomerTreatment
      amountDeducted = 0,
      sessionsDeducted = 1,
      performedBy,
      notes,
      staffId,
    } = body;

    // Validate input
    if (!customerId || !serviceId || !sourceType || !sourceId || !performedBy) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ các thông tin bắt buộc" }, { status: 400 });
    }

    const amountNum = Number(amountDeducted);
    const sessionsNum = Number(sessionsDeducted);

    const logResult = await db.$transaction(async (tx) => {
      // 1. Verify customer and service
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error("Khách hàng không tồn tại");

      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (!service) throw new Error("Dịch vụ không tồn tại");

      if (sourceType === "card") {
        // Fetch customer card
        const card = await tx.customerCard.findUnique({
          where: { id: sourceId },
          include: { template: true },
        });

        if (!card) throw new Error("Thẻ tài khoản của khách hàng không tồn tại");
        if (card.customerId !== customerId) throw new Error("Thẻ này không thuộc về khách hàng đã chọn");

        const currentBalanceNum = Number(card.currentBalance);
        if (currentBalanceNum < amountNum) {
          throw new Error("Số dư tài khoản thẻ không đủ để thanh toán");
        }

        // Deduct balance
        const updatedCard = await tx.customerCard.update({
          where: { id: sourceId },
          data: {
            currentBalance: currentBalanceNum - amountNum,
          },
        });

        // Create log
        const log = await tx.usageLog.create({
          data: {
            customerId,
            serviceId,
            sourceType,
            cardId: sourceId,
            amountDeducted: amountNum,
            sessionsDeducted: 0,
            performedBy,
            notes: notes || null,
            staffId: staffId || null,
          },
        });

        return { log, card: updatedCard };
      } else if (sourceType === "treatment") {
        // Fetch customer treatment session
        const treatment = await tx.customerTreatment.findUnique({
          where: { id: sourceId },
        });

        if (!treatment) throw new Error("Gói liệu trình của khách hàng không tồn tại");
        if (treatment.customerId !== customerId) throw new Error("Gói liệu trình này không thuộc về khách hàng đã chọn");

        if (treatment.usedSessions + sessionsNum > treatment.totalSessions) {
          throw new Error("Số buổi liệu trình còn lại không đủ");
        }

        // Increment sessions
        const updatedTreatment = await tx.customerTreatment.update({
          where: { id: sourceId },
          data: {
            usedSessions: treatment.usedSessions + sessionsNum,
          },
        });

        // Create log
        const log = await tx.usageLog.create({
          data: {
            customerId,
            serviceId,
            sourceType,
            treatmentId: sourceId,
            amountDeducted: 0,
            sessionsDeducted: sessionsNum,
            performedBy,
            notes: notes || null,
            staffId: staffId || null,
          },
        });

        return { log, treatment: updatedTreatment };
      } else {
        throw new Error("Nguồn sử dụng dịch vụ không hợp lệ");
      }
    });

    return NextResponse.json(logResult, { status: 201 });
  } catch (error: any) {
    console.error("POST Usage Log Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi ghi nhận sử dụng" }, { status: 500 });
  }
}
