import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all promotions
export async function GET() {
  try {
    const promotions = await db.promotion.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(promotions);
  } catch (error: any) {
    console.error("GET Promotions Error:", error);
    return NextResponse.json({ error: "Không thể lấy danh sách ưu đãi" }, { status: 500 });
  }
}

// POST create new promotion
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, image, isActive = true } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Tiêu đề và nội dung mô tả là bắt buộc" }, { status: 400 });
    }

    const promo = await db.promotion.create({
      data: {
        title,
        description,
        image: image || null,
        isActive,
      },
    });

    return NextResponse.json(promo, { status: 201 });
  } catch (error: any) {
    console.error("POST Promotion Error:", error);
    return NextResponse.json({ error: "Không thể tạo chương trình ưu đãi mới" }, { status: 500 });
  }
}
