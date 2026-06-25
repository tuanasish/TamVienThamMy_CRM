import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// Helper to determine customer tier based on total spent
export function calculateTier(spent: number): string {
  if (spent >= 500000000) return "Business+";
  if (spent >= 100000000) return "Business";
  if (spent >= 50000000) return "VIP+";
  if (spent >= 30000000) return "VIP";
  if (spent >= 20000000) return "Diamond";
  if (spent >= 10000000) return "Gold";
  if (spent >= 5000000) return "Silver";
  return "Member";
}

// GET all customers
export async function GET() {
  try {
    const customers = await db.customer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(customers);
  } catch (error: any) {
    console.error("GET Customers Error:", error);
    return NextResponse.json({ error: "Không thể lấy danh sách khách hàng" }, { status: 500 });
  }
}

// POST create new customer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, fullName, dob, address, gender, cccd, notes } = body;

    if (!phone || !fullName) {
      return NextResponse.json({ error: "Số điện thoại và họ tên là bắt buộc" }, { status: 400 });
    }

    // Check if customer already exists
    const existing = await db.customer.findUnique({
      where: { phone },
    });

    if (existing) {
      return NextResponse.json({ error: "Số điện thoại này đã được đăng ký" }, { status: 400 });
    }

    if (cccd) {
      const existingCCCD = await db.customer.findUnique({
        where: { cccd },
      });
      if (existingCCCD) {
        return NextResponse.json({ error: "Số CCCD này đã tồn tại trên hệ thống" }, { status: 400 });
      }
    }

    // Set default password to '123456' for new customer accounts
    const passwordHash = await bcrypt.hash("123456", 10);

    const customer = await db.customer.create({
      data: {
        phone,
        fullName,
        passwordHash,
        dob: dob ? new Date(dob) : null,
        address: address || null,
        gender: gender || null,
        cccd: cccd || null,
        notes: notes || null,
        totalSpent: 0,
        tier: "Thường",
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error("POST Customer Error:", error);
    return NextResponse.json({ error: "Không thể tạo thông tin khách hàng mới" }, { status: 500 });
  }
}
