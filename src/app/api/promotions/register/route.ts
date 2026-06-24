import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST register customer for a promotion
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { promotionId, customerPhone, customerName, notes } = body;

    if (!promotionId || !customerPhone || !customerName) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ thông tin: họ tên, số điện thoại và chương trình ưu đãi" },
        { status: 400 }
      );
    }

    // Verify promotion exists
    const promo = await db.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promo) {
      return NextResponse.json({ error: "Chương trình ưu đãi không tồn tại hoặc đã kết thúc" }, { status: 404 });
    }

    // Create the registration lead record
    const registration = await db.promotionRegistration.create({
      data: {
        promotionId,
        customerPhone,
        customerName,
        notes: notes || null,
        status: "pending",
      },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error: any) {
    console.error("POST Promotion Register Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi đăng ký nhận ưu đãi" }, { status: 500 });
  }
}
