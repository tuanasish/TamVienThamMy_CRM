import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET all staff accounts (only for logged-in staff)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("spa_crm_session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      return NextResponse.json({ error: "Phiên làm việc không hợp lệ" }, { status: 400 });
    }

    if (session.role !== "staff") {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này" }, { status: 403 });
    }

    const staffList = await db.staff.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        target: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(staffList);
  } catch (error: any) {
    console.error("GET Staff Error:", error);
    return NextResponse.json({ error: "Không thể lấy danh sách nhân viên" }, { status: 500 });
  }
}

// POST create a new staff account (only for logged-in staff)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("spa_crm_session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      return NextResponse.json({ error: "Phiên làm việc không hợp lệ" }, { status: 400 });
    }

    // Fetch live role from DB to verify admin permissions
    const dbStaff = await db.staff.findUnique({
      where: { id: session.id },
      select: { role: true }
    });

    if (dbStaff?.role !== "admin") {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, fullName, role = "staff", target } = body;

    if (!username || !password || !fullName) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin nhân viên" }, { status: 400 });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Validate username format (alphanumeric and dots/underscores only, no spaces)
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(normalizedUsername)) {
      return NextResponse.json({ error: "Tên tài khoản chỉ được chứa chữ cái, số, dấu chấm (.) và dấu gạch dưới (_)" }, { status: 400 });
    }

    // Check if username already exists
    const existing = await db.staff.findUnique({
      where: { username: normalizedUsername },
    });

    if (existing) {
      return NextResponse.json({ error: "Tên tài khoản này đã được sử dụng" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const targetNum = target !== undefined && target !== null && target !== "" ? Number(target) : null;

    // Create staff member
    const newStaff = await db.staff.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        fullName: fullName.trim(),
        role: role.trim(),
        target: targetNum,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        target: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newStaff, { status: 201 });
  } catch (error: any) {
    console.error("POST Staff Error:", error);
    return NextResponse.json({ error: "Không thể tạo tài khoản nhân viên mới" }, { status: 500 });
  }
}

// DELETE a staff account (only for logged-in staff)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID nhân viên cần xóa" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("spa_crm_session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      return NextResponse.json({ error: "Phiên làm việc không hợp lệ" }, { status: 400 });
    }

    // Fetch live role from DB to verify admin permissions
    const dbStaff = await db.staff.findUnique({
      where: { id: session.id },
      select: { role: true }
    });

    if (dbStaff?.role !== "admin") {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này" }, { status: 403 });
    }

    // Prevent self-deletion
    if (session.id === id) {
      return NextResponse.json({ error: "Bạn không thể tự xóa tài khoản của chính mình" }, { status: 400 });
    }

    // Check if the staff member has relations (invoices, usage logs)
    const [invoicesCount, logsCount] = await Promise.all([
      db.invoice.count({ where: { staffId: id } }),
      db.usageLog.count({ where: { staffId: id } }),
    ]);

    if (invoicesCount > 0 || logsCount > 0) {
      return NextResponse.json({
        error: "Không thể xóa nhân viên này vì họ đã có lịch sử lập hóa đơn hoặc ghi nhận dịch vụ trên hệ thống"
      }, { status: 400 });
    }

    // Delete the staff member
    await db.staff.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Staff Error:", error);
    // Handle Prisma foreign key constraint errors (P2003)
    if (error.code === "P2003") {
      return NextResponse.json({
        error: "Không thể xóa nhân viên này vì đã có dữ liệu giao dịch liên quan trên hệ thống"
      }, { status: 400 });
    }
    return NextResponse.json({ error: "Không thể xóa nhân viên" }, { status: 500 });
  }
}

// PUT update a staff account's target (only for logged-in staff)
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("spa_crm_session");

    if (!sessionCookie) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch (e) {
      return NextResponse.json({ error: "Phiên làm việc không hợp lệ" }, { status: 400 });
    }

    // Fetch live role from DB to verify admin permissions
    const dbStaff = await db.staff.findUnique({
      where: { id: session.id },
      select: { role: true }
    });

    if (dbStaff?.role !== "admin") {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này" }, { status: 403 });
    }

    const body = await request.json();
    const { id, target } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID nhân viên" }, { status: 400 });
    }

    const targetNum = target !== undefined && target !== null && target !== "" ? Number(target) : null;

    const updated = await db.staff.update({
      where: { id },
      data: {
        target: targetNum,
      },
      select: {
        id: true,
        fullName: true,
        target: true,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Staff Error:", error);
    return NextResponse.json({ error: "Không thể cập nhật chỉ tiêu nhân viên" }, { status: 500 });
  }
}

