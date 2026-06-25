import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Xác thực xem người dùng hiện tại có phải là Quản trị viên (admin) hay không.
 * Trả về NextResponse lỗi nếu không phải, hoặc null nếu xác thực thành công.
 */
export async function verifyAdmin() {
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

    // Truy vấn vai trò trực tiếp từ DB để đảm bảo tính chính xác
    const dbStaff = await db.staff.findUnique({
      where: { id: session.id },
      select: { role: true }
    });

    if (!dbStaff) {
      return NextResponse.json({ error: "Tài khoản nhân viên không tồn tại" }, { status: 401 });
    }

    if (dbStaff.role !== "admin") {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này" }, { status: 403 });
    }

    return null; // Xác thực thành công
  } catch (error) {
    console.error("Auth verification error:", error);
    return NextResponse.json({ error: "Lỗi xác thực hệ thống" }, { status: 500 });
  }
}

/**
 * Xác thực xem người dùng hiện tại có phải là Nhân viên hoặc Quản trị viên (staff/admin) hay không.
 * Trả về NextResponse lỗi nếu không phải, hoặc null nếu xác thực thành công.
 */
export async function verifyStaff() {
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

    // Truy vấn vai trò trực tiếp từ DB để đảm bảo tính chính xác
    const dbStaff = await db.staff.findUnique({
      where: { id: session.id },
      select: { role: true }
    });

    if (!dbStaff) {
      return NextResponse.json({ error: "Tài khoản nhân viên không tồn tại" }, { status: 401 });
    }

    // Cả admin và staff đều hợp lệ
    if (dbStaff.role !== "admin" && dbStaff.role !== "staff") {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này" }, { status: 403 });
    }

    return null; // Xác thực thành công
  } catch (error) {
    console.error("Staff auth verification error:", error);
    return NextResponse.json({ error: "Lỗi xác thực hệ thống" }, { status: 500 });
  }
}

