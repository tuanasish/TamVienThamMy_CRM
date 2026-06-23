import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spa CRM - Hệ thống quản lý thẩm mỹ viện",
  description: "Phần mềm quản lý khách hàng, liệu trình thẻ nạp và doanh số dành cho spa & thẩm mỹ viện chuyên nghiệp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.setAttribute('data-theme', 'light');
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
