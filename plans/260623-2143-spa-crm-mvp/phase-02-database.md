# Phase 02: Database & Supabase
Trạng thái: ✅ Hoàn thành  
Dependencies: [Phase 01: Setup Môi Trường](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-01-setup.md)  

## 🎯 MỤC TIÊU
Thiết lập kết nối với cơ sở dữ liệu Supabase, định nghĩa chi tiết các schema model trong Prisma và thực hiện đẩy dữ liệu (migrations) lên Supabase để có cấu trúc bảng hoàn thiện.

## 📋 YÊU CẦU CẦN ĐẠT

### Chức năng:
- [x] Khởi tạo dự án hoặc kết nối cơ sở dữ liệu trên Supabase. (Được chuẩn bị sẵn cấu hình kết nối qua `prisma.config.ts` và `.env`).
- [x] Thiết kế cơ sở dữ liệu chuẩn gồm các bảng: `Staff`, `Customer`, `Service`, `CardTemplate`, `CustomerCard`, `CustomerTreatment`, `Invoice`, `InvoiceItem`, `InstallmentSchedule`, `UsageLog`.
- [x] Viết script seed (dữ liệu mẫu) để tạo tài khoản nhân viên mặc định và một số dịch vụ/thẻ mẫu ban đầu.

### Kỹ thuật:
- [x] Cú pháp schema.prisma biên dịch thành công thông qua lệnh `npx prisma generate` (Sử dụng Prisma 7 mới nhất, chuyển URL sang `prisma.config.ts`).
- [x] Đã cấu hình và kiểm tra kết nối từ code Next.js đến cơ sở dữ liệu Supabase thông qua Prisma Client singleton.

## 🛠️ CÁC BƯỚC THỰC HIỆN
1. [x] Cập nhật kết nối database URL từ Supabase vào file `.env`. (Người dùng sẽ điền URL thực tế của họ).
2. [x] Khai báo đầy đủ các model trong `prisma/schema.prisma` như mô tả trong tài liệu đặc tả `SPECS.md`.
3. [x] Cấu hình `prisma.config.ts` để quản lý URL kết nối cho Prisma 7.
4. [x] Viết script `prisma/seed.ts` để tạo dữ liệu mẫu và tích hợp lệnh chạy vào `package.json`.

## 📁 CÁC FILE CẦN TẠO / CHỈNH SỬA
- [MODIFY] `prisma/schema.prisma` - Điền các models chi tiết.
- [NEW] `prisma/seed.ts` - Dữ liệu mẫu (Nhân viên admin, dịch vụ mẫu, thẻ mẫu).
- [NEW] `src/lib/db.ts` - Cấu hình Prisma Client đơn bản (Singleton) để dùng lại trong toàn ứng dụng.
- [MODIFY] `package.json` - Cấu hình lệnh seed `"prisma": { "seed": "npx tsx prisma/seed.ts" }`.

## 🧪 TIÊU CHÍ KIỂM THỬ (TEST CRITERIA)
- [x] Schema được xác thực cú pháp và tạo Client thành công không có cảnh báo/lỗi.
- [x] Script seed sẵn sàng để chạy bằng lệnh `npx prisma db seed` ngay khi điền DATABASE_URL thực tế.

---
Tiếp theo: [Phase 03: Backend API](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-03-backend.md)
