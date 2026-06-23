# Phase 01: Setup Môi Trường
Trạng thái: ✅ Hoàn thành  
Dependencies: Không có  

## 🎯 MỤC TIÊU
Khởi tạo cấu trúc mã nguồn Next.js 14+, cấu hình TypeScript, cài đặt các package cốt lõi cần thiết và thiết lập cấu trúc thư mục dự án sạch sẽ, tối ưu.

## 📋 YÊU CẦU CẦN ĐẠT

### Chức năng:
- [x] Khởi tạo ứng dụng Next.js mới bằng App Router.
- [x] Thiết lập file biến môi trường `.env` và `.env.example`.
- [x] Cấu hình git (`.gitignore`).

### Kỹ thuật:
- [x] Cài đặt các thư viện cần thiết: `prisma`, `@prisma/client`, `lucide-react`, `bcryptjs`, `@types/bcryptjs`.
- [x] Cấu hình ESLint & Prettier để thống nhất phong cách viết code.
- [x] Chạy thử ứng dụng local thành công (`npm run dev` ở port `3000`).

## 🛠️ CÁC BƯỚC THỰC HIỆN
1. [x] Chạy lệnh npx khởi tạo ứng dụng Next.js trong thư mục hiện tại `./`.
2. [x] Thiết lập cấu trúc thư mục sạch sẽ (chia components, hooks, lib, api...).
3. [x] Cấu hình Prisma và khởi tạo schema Prisma.
4. [x] Khởi động server dev và kiểm tra hoạt động trên trình duyệt.

## 📁 CÁC FILE CẦN TẠO / CHỈNH SỬA
- [NEW] `.env.example` - Định nghĩa các biến cấu hình (Supabase URL, Auth Secret...).
- [NEW] `prisma/schema.prisma` - Thiết lập kết nối và khai báo cơ sở dữ liệu.
- [MODIFY] `src/app/page.tsx` - Màn hình mặc định hiển thị trang chào mừng tối giản.

## 🧪 TIÊU CHÍ KIỂM THỬ (TEST CRITERIA)
- [x] Dự án build thành công không có lỗi TypeScript/ESLint.
- [x] Chạy `npm run dev` không bị crash và mở được trang chủ localhost.
- [x] Thư mục `.git` và `.gitignore` cấu hình đúng để tránh push file nhạy cảm.

---
Tiếp theo: [Phase 02: Database & Supabase](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-02-database.md)
