"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import styles from "@/app/staff/users/page.module.css";

interface DeleteStaffButtonProps {
  staffId: string;
  staffName: string;
}

export default function DeleteStaffButton({
  staffId,
  staffName,
}: DeleteStaffButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa tài khoản nhân viên "${staffName}" không? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/staff?id=${staffId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Không thể xóa nhân viên");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.25rem 0.5rem",
        fontSize: "0.75rem",
        gap: "0.35rem",
        background: "rgba(220, 53, 69, 0.1)",
        border: "1px solid rgba(220, 53, 69, 0.4)",
        color: "#ff4d4d",
        borderRadius: "4px",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }}
      title="Xóa tài khoản nhân viên"
    >
      <Trash2 size={13} />
      <span>{loading ? "..." : "Xóa"}</span>
    </button>
  );
}
