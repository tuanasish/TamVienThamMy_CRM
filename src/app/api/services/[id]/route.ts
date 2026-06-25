import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdmin } from "@/lib/auth";

// PUT edit service
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyAdmin();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { name, price, type, notes, tags } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: "Tên mặt hàng và giá là bắt buộc" }, { status: 400 });
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "Giá không hợp lệ" }, { status: 400 });
    }

    const serviceType = type === "product" ? "product" : "service";

    const updated = await db.service.update({
      where: { id },
      data: {
        name,
        price: priceNum,
        type: serviceType,
        notes: notes || "",
        tags: tags || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Service Error:", error);
    return NextResponse.json({ error: "Không thể cập nhật mặt hàng này" }, { status: 500 });
  }
}

// DELETE service
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyAdmin();
    if (authError) return authError;

    const { id } = await params;

    // Check if service is linked to any active treatment package or usage log
    const linkedTreatments = await db.customerTreatment.count({
      where: { serviceId: id },
    });

    const linkedLogs = await db.usageLog.count({
      where: { serviceId: id },
    });

    if (linkedTreatments > 0 || linkedLogs > 0) {
      return NextResponse.json(
        { error: "Không thể xóa dịch vụ này vì đã có lịch sử tiêu dùng hoặc khách hàng đang đăng ký liệu trình." },
        { status: 400 }
      );
    }

    await db.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Service Error:", error);
    return NextResponse.json({ error: "Không thể xóa dịch vụ này" }, { status: 500 });
  }
}
