"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import styles from "@/app/staff/customers/page.module.css";

interface DeleteCustomerButtonProps {
  customerId: string;
  customerName: string;
}

export default function DeleteCustomerButton({
  customerId,
  customerName,
}: DeleteCustomerButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa hồ sơ khách hàng "${customerName}" không? Hành động này sẽ xóa toàn bộ thẻ nạp và lịch trình của khách hàng và không thể hoàn tác.`
      )
    ) {
      return;
    }

    setLoading(false);
    setError("");
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Không thể xóa khách hàng");
      }

      router.push("/staff/customers");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={styles.searchBtn}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "rgba(220, 53, 69, 0.1)",
        border: "1px solid var(--accent-rose)",
        color: "var(--accent-rose)",
      }}
      title="Xóa hồ sơ khách hàng"
    >
      <Trash2 size={16} />
      <span>{loading ? "Đang xóa..." : "Xóa khách hàng"}</span>
    </button>
  );
}
