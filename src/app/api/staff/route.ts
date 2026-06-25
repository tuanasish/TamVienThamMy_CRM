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

    if (session.role !== "staff") {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, fullName, role = "staff" } = body;

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

    // Create staff member
    const newStaff = await db.staff.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        fullName: fullName.trim(),
        role: role.trim(),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newStaff, { status: 201 });
  } catch (error: any) {
    console.error("POST Staff Error:", error);
    return NextResponse.json({ error: "Không thể tạo tài khoản nhân viên mới" }, { status: 500 });
  }
}
