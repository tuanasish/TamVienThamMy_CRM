import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateTier } from "../route";

// GET detailed customer profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
          include: { staff: true },
        },
        cards: {
          include: { template: true },
        },
        treatments: {
          include: { service: true },
        },
        usageLogs: {
          orderBy: { usedAt: "desc" },
          include: { service: true, staff: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Không tìm thấy khách hàng này" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error: any) {
    console.error("GET Customer Detail Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi tải thông tin khách hàng" }, { status: 500 });
  }
}

// PUT update customer info
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fullName, phone, dob, address, gender, cccd, notes, status } = body;

    const currentCustomer = await db.customer.findUnique({
      where: { id },
    });

    if (!currentCustomer) {
      return NextResponse.json({ error: "Không tìm thấy khách hàng này" }, { status: 404 });
    }

    // Verify phone uniqueness if changed
    if (phone && phone !== currentCustomer.phone) {
      const phoneCheck = await db.customer.findUnique({ where: { phone } });
      if (phoneCheck) {
        return NextResponse.json({ error: "Số điện thoại này đã được đăng ký bởi khách khác" }, { status: 400 });
      }
    }

    // Verify CCCD uniqueness if changed
    if (cccd && cccd !== currentCustomer.cccd) {
      const cccdCheck = await db.customer.findUnique({ where: { cccd } });
      if (cccdCheck) {
        return NextResponse.json({ error: "Số CCCD này đã tồn tại trên hệ thống" }, { status: 400 });
      }
    }

    // Recalculate tier in case totalSpent changes or is recalculated
    const totalSpentNum = Number(currentCustomer.totalSpent);
    const calculatedTier = calculateTier(totalSpentNum);

    const updated = await db.customer.update({
      where: { id },
      data: {
        fullName: fullName ?? undefined,
        phone: phone ?? undefined,
        dob: dob ? new Date(dob) : undefined,
        address: address !== undefined ? address : undefined,
        gender: gender !== undefined ? gender : undefined,
        cccd: cccd !== undefined ? cccd : undefined,
        notes: notes !== undefined ? notes : undefined,
        status: status !== undefined ? status : undefined,
        tier: calculatedTier,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Customer Error:", error);
    return NextResponse.json({ error: "Không thể cập nhật thông tin khách hàng" }, { status: 500 });
  }
}

// DELETE customer
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.customer.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Customer Error:", error);
    return NextResponse.json({ error: "Không thể xóa khách hàng này" }, { status: 500 });
  }
}
