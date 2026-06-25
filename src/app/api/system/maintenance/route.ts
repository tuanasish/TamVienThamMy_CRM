import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMaintenanceStatus, setMaintenanceStatus } from "@/lib/systemConfig";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET the current maintenance status
export async function GET() {
  try {
    const isMaintenance = getMaintenanceStatus();
    return NextResponse.json({ maintenance: isMaintenance });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống khi đọc cấu hình" }, { status: 500 });
  }
}

// POST to update the maintenance status (Admin only)
export async function POST(request: Request) {
  try {
    // Verify staff session
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
    const { maintenance } = body;

    if (typeof maintenance !== "boolean") {
      return NextResponse.json({ error: "Trạng thái bảo trì phải là giá trị Boolean" }, { status: 400 });
    }

    setMaintenanceStatus(maintenance);

    return NextResponse.json({ success: true, maintenance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lỗi hệ thống khi cập nhật cấu hình" }, { status: 500 });
  }
}
