import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all card templates
export async function GET() {
  try {
    const templates = await db.cardTemplate.findMany({
      orderBy: { price: "asc" },
    });

    const parsedTemplates = templates.map(t => {
      try {
        return {
          ...t,
          services: typeof t.services === "string" ? JSON.parse(t.services) : t.services
        };
      } catch {
        return t;
      }
    });

    return NextResponse.json(parsedTemplates);
  } catch (error: any) {
    console.error("GET Card Templates Error:", error);
    return NextResponse.json({ error: "Không thể lấy danh sách mẫu thẻ" }, { status: 500 });
  }
}

// POST create card template
export async function POST(request: Request) {
  try {
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

    const template = await db.cardTemplate.create({
      data: {
        name,
        price: priceNum,
        value: valueNum,
        services: Array.isArray(services) ? JSON.stringify(services) : JSON.stringify([]),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error("POST Card Template Error:", error);
    return NextResponse.json({ error: "Không thể tạo mẫu thẻ mới" }, { status: 500 });
  }
}
