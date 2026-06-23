import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT edit card template
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price, value, services } = body;

    if (!name || price === undefined || value === undefined) {
      return NextResponse.json({ error: "Tên thẻ, giá gốc và giá trị nạp là bắt buộc" }, { status: 400 });
    }

    const priceNum = Number(price);
    const valueNum = Number(value);

    if (isNaN(priceNum) || priceNum <= 0 || isNaN(valueNum) || valueNum <= 0) {
      return NextResponse.json({ error: "Giá gốc và giá trị nạp phải là số lớn hơn 0" }, { status: 400 });
    }

    if (valueNum < priceNum) {
      return NextResponse.json({ error: "Giá trị nạp được dùng phải lớn hơn hoặc bằng giá gốc thực trả" }, { status: 400 });
    }

    const updated = await db.cardTemplate.update({
      where: { id },
      data: {
        name,
        price: priceNum,
        value: valueNum,
        services: Array.isArray(services) ? JSON.stringify(services) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Card Template Error:", error);
    return NextResponse.json({ error: "Không thể cập nhật mẫu thẻ này" }, { status: 500 });
  }
}

// DELETE card template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if any active customer card references this template
    const linkedCards = await db.customerCard.count({
      where: { templateId: id },
    });

    if (linkedCards > 0) {
      return NextResponse.json(
        { error: "Không thể xóa mẫu thẻ này vì đã có khách hàng mua thẻ." },
        { status: 400 }
      );
    }

    await db.cardTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Card Template Error:", error);
    return NextResponse.json({ error: "Không thể xóa mẫu thẻ này" }, { status: 500 });
  }
}
