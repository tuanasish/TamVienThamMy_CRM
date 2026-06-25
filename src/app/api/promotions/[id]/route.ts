import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyStaff } from "@/lib/auth";

// PUT update promotion
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyStaff();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { title, description, image, isActive } = body;

    const existing = await db.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy chương trình ưu đãi này" }, { status: 404 });
    }

    const updated = await db.promotion.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        image: image !== undefined ? image : existing.image,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Promotion Error:", error);
    return NextResponse.json({ error: "Không thể cập nhật chương trình ưu đãi" }, { status: 500 });
  }
}

// DELETE promotion
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyStaff();
    if (authError) return authError;

    const { id } = await params;

    const existing = await db.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy chương trình ưu đãi này" }, { status: 404 });
    }

    await db.promotion.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Xóa chương trình ưu đãi thành công" });
  } catch (error: any) {
    console.error("DELETE Promotion Error:", error);
    return NextResponse.json({ error: "Không thể xóa chương trình ưu đãi" }, { status: 500 });
  }
}
