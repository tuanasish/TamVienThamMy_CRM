import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT edit/update appointment status or details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, dateTime, notes } = body;

    const updated = await db.appointment.update({
      where: { id },
      data: {
        status,
        dateTime: dateTime ? new Date(dateTime) : undefined,
        notes,
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

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT Appointment Error:", error);
    return NextResponse.json({ error: "Không thể cập nhật lịch hẹn" }, { status: 500 });
  }
}

// DELETE an appointment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.appointment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Appointment Error:", error);
    return NextResponse.json({ error: "Không thể xóa lịch hẹn" }, { status: 500 });
  }
}
