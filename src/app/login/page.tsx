"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { LogIn, ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "customer"; // default to customer portal

  const [usernameOrPhone, setUsernameOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernameOrPhone,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      // Redirect depending on role
      if (role === "staff") {
        router.push("/staff");
      } else {
        router.push("/customer");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.card}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
        <Logo size="large" />
      </div>
      <h2 className={styles.roleTitle} style={{ marginTop: 0 }}>
        Đăng nhập - Phân hệ {role === "staff" ? "Nhân viên" : "Khách hàng"}
      </h2>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.inputGroup}>
          <label htmlFor="username" className={styles.label}>
            {role === "staff" ? "Tên tài khoản (username)" : "Số điện thoại"}
          </label>
          <input
            id="username"
            type="text"
            className={styles.input}
            placeholder={role === "staff" ? "Nhập tên tài khoản" : "Nhập số điện thoại"}
            value={usernameOrPhone}
            onChange={(e) => setUsernameOrPhone(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            className={styles.input}
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          <LogIn size={18} />
          {loading ? "Đang xác thực..." : "Đăng Nhập"}
        </button>
      </form>

      <a href="/" className={styles.backLink}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <ArrowLeft size={16} /> Quay về Trang chủ
        </div>
      </a>
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div className={styles.card}>Đang tải trang đăng nhập...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
