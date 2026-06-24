import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT update promotion registration status (e.g. mark as contacted)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body; // 'pending', 'contacted', 'cancelled'

    if (!status || !["pending", "contacted", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái xử lý không hợp lệ" }, { status: 400 });
    }

    const existing = await db.promotionRegistration.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ đăng ký ưu đãi này" }, { status: 404 });
    }

    const updated = await db.promotionRegistration.update({
      where: { id },
      data: {
        status,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Registration Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi cập nhật trạng thái đăng ký" }, { status: 500 });
  }
}

// DELETE promotion registration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.promotionRegistration.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ đăng ký ưu đãi này" }, { status: 404 });
    }

    await db.promotionRegistration.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Xóa hồ sơ đăng ký thành công" });
  } catch (error: any) {
    console.error("DELETE Registration Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi xóa đăng ký ưu đãi" }, { status: 500 });
  }
}
