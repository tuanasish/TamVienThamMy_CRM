import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getMaintenanceStatus } from "@/lib/systemConfig";

export async function POST(request: Request) {
  try {
    const { usernameOrPhone, password, role } = await request.json();

    if (!usernameOrPhone || !role || (role === "staff" && !password)) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ thông tin đăng nhập" },
        { status: 400 }
      );
    }

    if (role === "staff") {
      const staff = await db.staff.findUnique({
        where: { username: usernameOrPhone },
      });

      if (!staff) {
        return NextResponse.json(
          { error: "Tài khoản nhân viên không tồn tại" },
          { status: 401 }
        );
      }

      const isPasswordMatch = await bcrypt.compare(password, staff.passwordHash);
      if (!isPasswordMatch) {
        return NextResponse.json(
          { error: "Mật khẩu không chính xác" },
          { status: 401 }
        );
      }

      // Create response and set cookie
      const response = NextResponse.json({
        user: {
          id: staff.id,
          username: staff.username,
          fullName: staff.fullName,
          role: "staff",
        },
      });

      // In real-world, hash or encrypt this. For local production-ready simple MVP, we set serialized user state.
      response.cookies.set("spa_crm_session", JSON.stringify({
        id: staff.id,
        fullName: staff.fullName,
        role: "staff",
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return response;
    } else if (role === "customer") {
      // Check maintenance status
      if (getMaintenanceStatus()) {
        return NextResponse.json(
          { error: "Hệ thống cổng thông tin khách hàng đang bảo trì định kỳ. Vui lòng quay lại sau." },
          { status: 503 }
        );
      }

      const customer = await db.customer.findUnique({
        where: { phone: usernameOrPhone },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Số điện thoại khách hàng chưa được đăng ký" },
          { status: 401 }
        );
      }

      const response = NextResponse.json({
        user: {
          id: customer.id,
          phone: customer.phone,
          fullName: customer.fullName,
          role: "customer",
        },
      });

      response.cookies.set("spa_crm_session", JSON.stringify({
        id: customer.id,
        fullName: customer.fullName,
        role: "customer",
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return response;
    } else {
      return NextResponse.json(
        { error: "Vai trò đăng nhập không hợp lệ" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: `Đã xảy ra lỗi trong quá trình đăng nhập: ${error.message || error.toString()}` },
      { status: 500 }
    );
  }
}
