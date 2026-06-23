# Phase 05: Tích Hợp Hệ Thống
Trạng thái: ⬜ Chưa bắt đầu  
Dependencies: [Phase 04: Giao Diện Frontend](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-04-frontend.md)  

## 🎯 MỤC TIÊU
Kết nối toàn bộ giao diện Frontend với các API Backend. Xử lý lưu trữ phiên đăng nhập (Session/Auth State), thực hiện các truy vấn gửi form dữ liệu lên server, xử lý hiển thị trạng thái loading, lỗi (error handling) và cập nhật giao diện thời gian thực (real-time UI updates).

## 📋 YÊU CẦU CẦN ĐẠT

### Chức năng:
- [ ] Tích hợp đăng nhập: Lưu trữ thông tin đăng nhập vào Cookie/LocalStorage, tự động định tuyến (Staff vào `/staff`, Customer vào `/customer`).
- [ ] Tích hợp quản lý khách hàng: Gửi form tạo khách hàng, tải danh sách khách hàng lên bảng hiển thị.
- [ ] Tích hợp lập hóa đơn: Gửi hóa đơn bán hàng, kiểm tra tính toán lịch trả góp tự động hiển thị trước khi lưu hóa đơn.
- [ ] Tích hợp quẹt thẻ & liệu trình: Cập nhật số buổi làm hoặc số dư thẻ ngay trên giao diện của cả nhân viên và khách hàng khi quẹt thành công.
- [ ] Tích hợp cổng tra cứu của khách hàng: Hiển thị đúng dữ liệu cá nhân theo số điện thoại đã đăng nhập.

### Kỹ thuật:
- [ ] Sử dụng React `useState`, `useEffect` hoặc các hook như `SWR`/`React Query` để quản lý trạng thái fetch dữ liệu.
- [ ] Xử lý chặn truy cập trái phép (Middleware bảo vệ định tuyến `/staff` và `/customer`).

## 🛠️ CÁC BƯỚC THỰC HIỆN
1. [ ] Cài đặt Next.js Middleware để chặn truy cập chéo giữa phân hệ Nhân viên và Khách hàng.
2. [ ] Tích hợp luồng đăng nhập/đăng xuất trong hệ thống.
3. [ ] Liên kết các form tạo mới khách hàng, dịch vụ, thẻ nạp với API POST tương ứng.
4. [ ] Liên kết form bán hàng với API tạo hóa đơn. Hiển thị thông tin tổng kết hóa đơn trước khi lưu.
5. [ ] Thực hiện tích hợp tính năng sử dụng dịch vụ (UsageLog): Khi nhân viên bấm "Sử dụng" một buổi liệu trình của khách, gửi yêu cầu lên API backend và tải lại (refresh) số liệu.

## 📁 CÁC FILE CẦN TẠO / CHỈNH SỬA
- `src/middleware.ts` - Middleware bảo mật định tuyến.
- `src/app/login/page.tsx` - Liên kết API Login.
- `src/components/InvoiceForm.tsx` - Tích hợp luồng tạo bill và hiển thị bảng phân bổ trả góp.
- `src/components/UsageModal.tsx` - Form quẹt thẻ / ghi nhận sử dụng liệu trình.

## 🧪 TIÊU CHÍ KIỂM THỬ (TEST CRITERIA)
- [ ] Khách hàng không thể truy cập vào đường dẫn `/staff/...` (bị đá về trang login hoặc trang lỗi).
- [ ] Sau khi bấm lưu hóa đơn bán thẻ 10tr cho khách hàng A, số dư thẻ của khách hàng A lập tức thay đổi trên trang chi tiết khách hàng mà không cần reset server.
- [ ] Khi nhập hóa đơn trả góp, xem trước (preview) bảng lịch đóng tiền trùng khớp với dữ liệu lưu vào database.

---
Tiếp theo: [Phase 06: Kiểm Thử & Hoàn Thiện](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-06-testing.md)
