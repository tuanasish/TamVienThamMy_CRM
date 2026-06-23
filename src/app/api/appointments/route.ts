import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET appointments for a specific date or today
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // Format: YYYY-MM-DD
    
    let start: Date;
    let end: Date;
    
    if (dateParam) {
      start = new Date(`${dateParam}T00:00:00`);
      end = new Date(`${dateParam}T23:59:59.999`);
    } else {
      // Default to today in system timezone
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const appointments = await db.appointment.findMany({
      where: {
        dateTime: {
          gte: start,
          lte: end,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        dateTime: "asc",
      },
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error("GET Appointments Error:", error);
    return NextResponse.json({ error: "Không thể tải danh sách lịch hẹn" }, { status: 500 });
  }
}

// POST create a new appointment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, dateTime, notes } = body;

    if (!customerId || !dateTime) {
      return NextResponse.json({ error: "Khách hàng và thời gian hẹn là bắt buộc" }, { status: 400 });
    }

    const appointment = await db.appointment.create({
      data: {
        customerId,
        dateTime: new Date(dateTime),
        notes,
        status: "pending",
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error: any) {
    console.error("POST Appointment Error:", error);
    return NextResponse.json({ error: "Không thể đặt lịch hẹn" }, { status: 500 });
  }
}
