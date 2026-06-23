# Phase 06: Kiểm Thử & Hoàn Thiện
Trạng thái: ⬜ Chưa bắt đầu  
Dependencies: [Phase 05: Tích Hợp Hệ Thống](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-06-testing.md)  

## 🎯 MỤC TIÊU
Thực hiện các kịch bản kiểm thử toàn diện (End-to-End Testing) các luồng nghiệp vụ cốt lõi, phát hiện lỗi làm tròn số dư, tối ưu hóa CSS, dọn dẹp log, chuẩn bị tài liệu bàn giao và deploy ứng dụng lên Vercel.

## 📋 YÊU CẦU CẦN ĐẠT

### Kiểm thử các kịch bản quan trọng (Test Cases):
- [ ] **Kịch bản 1: Mua thẻ nạp & Tiêu dùng thẻ**
  - Mua thẻ nạp 10tr tặng thêm 20tr (tổng số dư 30tr).
  - Sử dụng dịch vụ 3tr, kiểm tra số dư tổng còn lại (`27tr`), số dư gốc còn lại (`9tr`), số dư khuyến mãi còn lại (`18tr`).
  - Kiểm tra xem khách hàng đăng nhập cổng tra cứu có thấy đúng các số liệu này không.
- [ ] **Kịch bản 2: Bán gói liệu trình & Trừ buổi**
  - Bán dịch vụ liệu trình 5 buổi tặng 1 buổi (tổng 6 buổi).
  - Nhân viên tích chọn thực hiện làm dịch vụ 2 lần, kiểm tra xem tiến trình hiển thị đúng `2/6` kèm thông tin ngày thực hiện trên cả giao diện nhân viên và cổng khách hàng.
- [ ] **Kịch bản 3: Hóa đơn trả góp & Công nợ**
  - Tạo hóa đơn trị giá 12tr, hình thức trả góp 6 tháng, thanh toán trước 2tr.
  - Kiểm tra xem lịch đóng tiền 6 tháng tiếp theo có tạo đúng mỗi tháng đóng 1.666.667đ (kỳ cuối cùng làm tròn bù phần lẻ).
  - Kiểm tra xem tổng nợ của khách hàng có cập nhật đúng là 10tr.
  - Nhân viên click thanh toán 1 kỳ trả góp, kiểm tra xem công nợ giảm đi tương ứng và lịch trả góp chuyển trạng thái 'paid'.
- [ ] **Kịch bản 4: Target doanh số sale & Báo cáo**
  - Nhân viên tạo hóa đơn được gắn tên Sale A.
  - Kiểm tra báo cáo doanh thu ngày tăng lên và doanh số của Sale A tăng đúng bằng tổng giá trị hóa đơn.

### Hoàn thiện kỹ thuật:
- [ ] Kiểm tra lỗi bảo mật định tuyến (Middleware).
- [ ] Kiểm tra tốc độ tải trang và các lỗi giao diện bị vỡ (Responsive check).
- [ ] Chuẩn bị các biến môi trường để sẵn sàng deploy lên Vercel.

## 🛠️ CÁC BƯỚC THỰC HIỆN
1. [ ] Chạy kiểm thử thủ công toàn bộ 4 kịch bản trên và ghi nhận kết quả.
2. [ ] Sửa các lỗi phát sinh (đặc biệt là sai số thập phân khi nhân tỷ lệ).
3. [ ] Xóa bỏ toàn bộ `console.log` thừa và tối ưu hóa CSS Module.
4. [ ] Build ứng dụng local ở môi trường production (`npm run build`) để kiểm tra lỗi build.
5. [ ] Cấu hình Vercel project, thêm các biến môi trường từ Supabase để deploy sản phẩm thực tế.

## 📁 CÁC FILE CẦN TẠO / CHỈNH SỬA
- `docs/walkthrough.md` - Hướng dẫn sử dụng và kiểm thử chi tiết.
- `package.json` - Đảm bảo các script build hoạt động đúng.

## 🧪 TIÊU CHÍ KIỂM THỬ (TEST CRITERIA)
- [ ] Không còn bất kỳ lỗi nào xuất hiện trong console khi chạy thử toàn bộ luồng.
- [ ] Build dự án Next.js thành công không có lỗi compile.
- [ ] Deploy lên Vercel thành công và hoạt động trơn tru với DB Supabase online.

---
*Hoàn thành dự án!*
