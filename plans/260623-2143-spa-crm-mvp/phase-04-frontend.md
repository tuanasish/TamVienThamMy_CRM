# Phase 04: Giao Diện Frontend
Trạng thái: ⬜ Chưa bắt đầu  
Dependencies: [Phase 03: Backend API](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-03-backend.md)  

## 🎯 MỤC TIÊU
Xây dựng giao diện người dùng (UI) cho cả 2 cổng: Cổng nhân viên (Staff Dashboard) và Cổng khách hàng (Customer Portal) bằng Next.js, TypeScript và Vanilla CSS. Đảm bảo giao diện hiện đại, trực quan, có tính tương tác cao (micro-animations).

## 📋 YÊU CẦU CẦN ĐẠT

### Giao diện Nhân viên (Staff Dashboard):
- [ ] **Màn hình Đăng nhập:** Đơn giản, đẹp mắt.
- [ ] **Trang chủ Dashboard:** Thống kê doanh thu ngày/tháng, biểu đồ mini (sử dụng SVG/CSS thuần hoặc Chart.js), danh sách target sale.
- [ ] **Trang Khách hàng:**
  - Danh sách khách hàng kèm lọc theo phân hạng.
  - Form thêm mới/sửa khách hàng.
  - Trang hồ sơ chi tiết của khách hàng (lịch sử chi tiêu, thẻ đang có, dịch vụ đã làm).
- [ ] **Trang Bán hàng (Lập hóa đơn):** Chọn khách hàng, chọn dịch vụ/thẻ cần bán, áp dụng giảm giá, tick chọn sale, chọn loại thanh toán (trả thẳng / trả góp).
- [ ] **Trang Điều khiển (Cấu hình):** Cấu hình dịch vụ (Tên, giá, tag) và thẻ (Tên, giá gốc, giá trị tăng thêm, dịch vụ áp dụng).
- [ ] **Trang Báo cáo:** Hiển thị biểu đồ doanh thu, danh sách công nợ khách hàng, báo cáo chi phí trả góp/cost.

### Giao diện Khách hàng (Customer Portal):
- [ ] **Trang Đăng nhập:** Đăng nhập bằng số điện thoại.
- [ ] **Trang tổng quan cá nhân:** Hiển thị hạng thành viên hiện tại, danh sách thẻ đang sở hữu, các liệu trình đang điều trị.
- [ ] **Chi tiết Thẻ tài khoản:** Xem tổng số dư, số tiền gốc còn lại và tiền khuyến mãi còn lại. Xem nhật ký sử dụng thẻ.
- [ ] **Tiến trình liệu trình:** Hiển thị tiến trình sử dụng dịch vụ dạng phân số (ví dụ: `2/6` buổi) bằng thanh phần trăm trực quan.

## 🛠️ CÁC BƯỚC THỰC HIỆN
1. [ ] Tạo file CSS toàn cục (`src/app/globals.css`) thiết lập các biến màu sắc (Color Tokens), fonts, CSS Reset, và CSS Grid/Flexbox tiện ích.
2. [ ] Xây dựng layout định tuyến cho Staff (`/staff`) và Customer (`/customer`).
3. [ ] Viết các Component UI chung (Button, Input, Card, Modal, Table, Badge).
4. [ ] Thiết kế và viết code cho từng màn hình giao diện cụ thể theo cấu trúc thư mục.
5. [ ] Áp dụng các hiệu ứng Hover, Transition để giao diện premium hơn.

## 📁 CÁC FILE CẦN TẠO / CHỈNH SỬA
- `src/app/globals.css` - Design system chính.
- `src/components/` - Các component tái sử dụng (Sidebar, Header, Layouts, Chart, Modal).
- `src/app/staff/` - Toàn bộ trang giao diện của nhân viên.
- `src/app/customer/` - Toàn bộ trang giao diện của khách hàng.
- `src/app/login/` - Trang đăng nhập chung cho hệ thống.

## 🧪 TIÊU CHÍ KIỂM THỬ (TEST CRITERIA)
- [ ] Giao diện hiển thị tốt trên cả màn hình máy tính và thiết bị di động (Responsive).
- [ ] Toàn bộ các tương tác nút bấm, mở modal, chuyển trang diễn ra mượt mà không có độ trễ lớn.
- [ ] Không có lỗi CSS bị ghi đè chéo (sử dụng CSS Modules).

---
Tiếp theo: [Phase 05: Tích Hợp Hệ Thống](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-05-integration.md)
