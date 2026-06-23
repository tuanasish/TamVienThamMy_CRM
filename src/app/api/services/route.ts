import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all services
export async function GET() {
  try {
    const services = await db.service.findMany({
      orderBy: { name: "asc" },
    });
    
    // Parse tags JSON string if necessary
    const parsedServices = services.map(s => {
      try {
        return {
          ...s,
          tags: typeof s.tags === "string" ? JSON.parse(s.tags) : s.tags
        };
      } catch {
        return s;
      }
    });
    
    return NextResponse.json(parsedServices);
  } catch (error: any) {
    console.error("GET Services Error:", error);
    return NextResponse.json({ error: "Không thể lấy danh sách dịch vụ" }, { status: 500 });
  }
}

// POST create service
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, price, type, tags } = body;

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
        tags: Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]),
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    console.error("POST Service Error:", error);
    return NextResponse.json({ error: "Không thể tạo mặt hàng mới" }, { status: 500 });
  }
}
