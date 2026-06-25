import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdmin } from "@/lib/auth";

// GET all services
export async function GET() {
  try {
    const services = await db.service.findMany({
      orderBy: { name: "asc" },
    });
    
    return NextResponse.json(services);
  } catch (error: any) {
    console.error("GET Services Error:", error);
    return NextResponse.json({ error: "Không thể lấy danh sách dịch vụ" }, { status: 500 });
  }
}

// POST create service
export async function POST(request: Request) {
  try {
    const authError = await verifyAdmin();
    if (authError) return authError;

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

    const service = await db.service.create({
      data: {
        name,
        price: priceNum,
        type: serviceType,
        notes: notes || "",
        tags: tags || null,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    console.error("POST Service Error:", error);
    return NextResponse.json({ error: "Không thể tạo mặt hàng mới" }, { status: 500 });
  }
}
