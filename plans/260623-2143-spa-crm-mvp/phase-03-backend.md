# Phase 03: Backend API
Trạng thái: ✅ Hoàn thành  
Dependencies: [Phase 02: Database & Supabase](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-02-database.md)  

## 🎯 MỤC TIÊU
Xây dựng hệ thống các API Endpoint trong Next.js (App Router Route Handlers) để cung cấp dữ liệu cho giao diện Frontend, thực hiện các nghiệp vụ tính toán thẻ, phân hạng thành viên, hóa đơn trả góp và báo cáo doanh thu.

## 📋 YÊU CẦU CẦN ĐẠT

### Chức năng:
- [x] **API Auth:** Đăng nhập cho Nhân viên (Staff) và Khách hàng (Customer) bằng số điện thoại.
- [x] **API Khách hàng:** CRUD thông tin khách hàng. Logic tự động cập nhật hạng thành viên khi tổng chi tiêu thay đổi.
- [x] **API Bán hàng & Hóa đơn:** Tạo hóa đơn. Logic tự động lập lịch thu trả góp (InstallmentSchedule) và tính công nợ nếu thanh toán trả góp. Gắn doanh số cho Sale.
- [x] **API Cấu hình:** CRUD Dịch vụ và mẫu Thẻ nạp.
- [x] **API Sử dụng:** Ghi nhận quẹt thẻ nạp (trừ số dư theo tỷ lệ thực/khuyến mãi) hoặc làm liệu trình (cập nhật số buổi `used_sessions`).
- [x] **API Báo cáo:** Doanh thu (ngày/tuần/tháng/năm), công nợ, chi phí trả góp/cost và target của sale.

### Kỹ thuật:
- [x] Xử lý bảo mật, mã hóa mật khẩu (`bcryptjs`) và cơ chế xác thực phiên đăng nhập đơn giản (Token/Cookie).
- [x] Làm tròn số thập phân (round) trong database để tránh sai số tỷ lệ tiền gốc / khuyến mãi.

## 🛠️ CÁC BƯỚC THỰC HIỆN
1. [x] Xây dựng thư mục API và các route handler tương ứng.
2. [x] Viết logic tính toán hạng thành viên trong Service/Khách hàng.
3. [x] Viết logic trừ tiền thẻ: trừ tổng tiền, đồng thời lưu lịch sử tiêu hao tiền gốc & tiền khuyến mãi theo công thức.
4. [x] Viết logic tạo lịch trả góp (installment schedule generator) dựa vào số tháng đăng ký.
5. [x] Viết các API tổng hợp dữ liệu báo cáo (Aggregation queries).

## 📁 CÁC FILE CẦN TẠO / CHỈNH SỬA
- [NEW] `src/app/api/auth/login/route.ts` - Xử lý đăng nhập.
- [NEW] `src/app/api/auth/logout/route.ts` - Xử lý đăng xuất.
- [NEW] `src/app/api/customers/route.ts` & `[id]/route.ts` - API Khách hàng & Tự động nâng hạng.
- [NEW] `src/app/api/services/route.ts` - API Quản lý dịch vụ.
- [NEW] `src/app/api/cards/route.ts` - API Quản lý thẻ nạp.
- [NEW] `src/app/api/invoices/route.ts` - API Hóa đơn & Tạo trả góp.
- [NEW] `src/app/api/invoices/installments/[scheduleId]/route.ts` - API Đóng tiền trả góp.
- [NEW] `src/app/api/usage/route.ts` - API Ghi nhận sử dụng (quẹt thẻ / trừ liệu trình).
- [NEW] `src/app/api/reports/route.ts` - API Báo cáo tổng hợp.

## 🧪 TIÊU CHÍ KIỂM THỬ (TEST CRITERIA)
- [x] Đăng nhập thành công trả về đúng thông tin vai trò (Staff/Customer) và ghi nhận HTTP Only cookie.
- [x] Khi tạo hóa đơn trị giá 30tr, hạng khách hàng tự động cập nhật lên "Diamond" (mốc 30tr).
- [x] Khi nạp thẻ 10tr được 30tr, sau đó quẹt dịch vụ 3tr, API trả về đúng số dư gốc còn lại là 9tr và khuyến mãi là 18tr.
- [x] Lập lịch trả góp 6 tháng chia đều đúng số tiền và tạo ra đúng 6 bản ghi trong bảng lịch trả góp với số lẻ được cộng dồn kỳ cuối.

---
Tiếp theo: [Phase 04: Giao Diện Frontend](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-04-frontend.md)
