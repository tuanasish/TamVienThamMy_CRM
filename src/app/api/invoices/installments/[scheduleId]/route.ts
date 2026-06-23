import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT to update installment payment status (mark as paid)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const body = await request.json();
    const { status } = body; // 'pending' or 'paid'

    if (!status || !["pending", "paid"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái thanh toán không hợp lệ" }, { status: 400 });
    }

    const currentSchedule = await db.installmentSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!currentSchedule) {
      return NextResponse.json({ error: "Không tìm thấy kỳ trả góp này" }, { status: 404 });
    }

    const updated = await db.installmentSchedule.update({
      where: { id: scheduleId },
      data: {
        status,
        paidAt: status === "paid" ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Installment Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi cập nhật kỳ trả góp" }, { status: 500 });
  }
}
