# 💡 BRIEF: spa-crm (Hệ thống CRM Thẩm Mỹ Viện)

**Ngày tạo:** 2026-06-23  
**Trạng thái:** 🎯 Đã chốt yêu cầu

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Các spa/thẩm mỹ viện gặp khó khăn trong việc quản lý hồ sơ khách hàng, đặc biệt là các chương trình thẻ trả trước (nạp thẻ nhân tài khoản) và liệu trình nhiều buổi phức tạp.
- Thiếu công cụ ghi nhận doanh số cho Sale và tính toán các hình thức thanh toán trả góp (6, 9, 12 tháng) đi kèm công nợ.
- Khách hàng không thể chủ động tự tra cứu số dư tài khoản thẻ khuyến mãi, lịch sử làm liệu trình và tiến trình điều trị thực tế, dẫn đến thiếu sự minh bạch và giảm trải nghiệm dịch vụ.

## 2. GIẢI PHÁP ĐỀ XUẤT
- Xây dựng một Web App CRM tinh gọn hỗ trợ đầy đủ các phân hệ nhập liệu doanh số, quản lý thẻ thành viên nạp trước, tính toán tỷ lệ tiêu hao thẻ (thực tế vs khuyến mãi), và quản lý lịch trả góp/nợ nần.
- Cung cấp cổng tra cứu (Customer Portal) bảo mật bằng số điện thoại để khách hàng chủ động kiểm soát thẻ/dịch vụ của mình.

## 3. ĐỐI TƯỢNG SỬ DỤNG & ROLES
- **Nhân viên (Staff):** Đăng nhập vào Dashboard quản trị để quản lý khách hàng, cấu hình thẻ/dịch vụ, bán hàng, nhập hóa đơn trả góp, xem báo cáo doanh số, nợ nần, target.
- **Khách hàng (Customer):** Đăng nhập cổng tra cứu cá nhân để xem số dư thẻ (tiền gốc + khuyến mãi), liệu trình dịch vụ (`2/6`...), hóa đơn và lịch sử sử dụng.

---

## 4. QUY TẮC NGHIỆP VỤ ĐÃ THỐNG NHẤT

### 4.1. Cơ chế thẻ nạp nhân số dư (Ví dụ: mua thẻ 10tr được 30tr)
- **Tỷ lệ quy đổi:** Hệ thống tự động lưu trữ giá trị mua thật ban đầu và giá trị spa tặng thêm (khuyến mãi).
- **Trừ tiền tiêu hao:** Khi khách sử dụng dịch vụ, trừ trực tiếp trên tổng số dư. Đồng thời, hiển thị trực quan tỷ lệ tiền gốc còn lại và tiền khuyến mãi còn lại tương ứng để khách hàng dễ dàng theo dõi.
  - *Công thức:* 
    - $\text{Tiền gốc còn lại} = \text{Tổng số dư còn lại} \times \frac{\text{Giá trị gốc ban đầu}}{\text{Tổng số dư ban đầu}}$
    - $\text{Tiền khuyến mãi còn lại} = \text{Tổng số dư còn lại} \times \frac{\text{Giá trị khuyến mãi ban đầu}}{\text{Tổng số dư ban đầu}}$

### 4.2. Quản lý hóa đơn trả góp
- Cho phép thanh toán trả góp với kỳ hạn 6, 9, hoặc 12 tháng.
- Ghi nhận doanh số cho Sale trên tổng hóa đơn ngay khi tạo, quản lý phần tiền chưa thu ở mục công nợ.
- Hỗ trợ ghi nhận phí chuyển đổi trả góp của ngân hàng để trừ vào chi phí báo cáo.

---

## 5. DANH SÁCH TÍNH NĂNG (MVP SCOPE)

### 🚀 Phân hệ Nhân viên (Staff Dashboard)
- [ ] **Quản lý khách hàng:**
  - [ ] Thêm mới khách hàng (Họ tên, SĐT, Ngày sinh, Địa chỉ, Giới tính, CCCD, Ghi chú).
  - [ ] Danh sách khách hàng kèm phân hạng tự động theo tổng chi tiêu lũy kế (Member, Silver, Gold, Diamond, VIP, VIP+, Business, Business+).
  - [ ] Xem chi tiết lịch sử chi tiêu, các thẻ đang sở hữu, dịch vụ đã làm.
- [ ] **Bán hàng & Hóa đơn:**
  - [ ] Tạo hóa đơn mới cho khách hàng (chọn dịch vụ/thẻ, nhập giảm giá/khuyến mãi).
  - [ ] Gắn nhân viên Sale thụ hưởng (tick doanh số).
  - [ ] Chọn hình thức: Trả thẳng hoặc Trả góp (kỳ hạn 6, 9, 12 tháng), tự động lập lịch thu nợ mỗi tháng.
  - [ ] Thêm ghi chú nội bộ cho hóa đơn.
- [ ] **Điều khiển (Cấu hình hệ thống):**
  - [ ] Tạo mới và quản lý dịch vụ (Tên dịch vụ, Giá, Tag đi kèm).
  - [ ] Tạo mới và quản lý thẻ (Tên thẻ, Giá gốc thực trả, Giá trị tăng thêm, dịch vụ áp dụng).
- [ ] **Báo cáo & Thống kê:**
  - [ ] Doanh thu (Ngày, tuần, tháng, năm), so sánh cùng kỳ.
  - [ ] Target doanh số & doanh thu thực tế của từng nhân viên sale.
  - [ ] Báo cáo công nợ của khách hàng.
  - [ ] Báo cáo chi phí trả góp (phí ngân hàng) và chi phí cost (giá vốn).

### 👤 Phân hệ Khách hàng (Customer Portal)
- [ ] **Đăng nhập tra cứu:** Đăng nhập bảo mật bằng Số điện thoại.
- [ ] **Trang tổng quan cá nhân:**
  - [ ] Xem thông tin hạng thành viên và tổng chi tiêu hiện tại.
  - [ ] Xem danh sách thẻ/dịch vụ đang sở hữu.
- [ ] **Chi tiết thẻ nạp:**
  - [ ] Xem số dư tổng còn lại, chi tiết số dư gốc còn lại và khuyến mãi còn lại.
  - [ ] Lịch sử các ngày làm dịch vụ đã trừ tiền từ thẻ.
- [ ] **Dịch vụ 1 lần:** Ngày mua, trạng thái (Chưa dùng / Đã dùng).
- [ ] **Liệu trình nhiều lần:** Hiển thị tiến trình sử dụng thực tế (Ví dụ: `2/6` buổi) kèm ngày thực hiện từng buổi.

---

## 6. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung bình (Custom business logic cho thẻ và trả góp, 2 cổng đăng nhập khác nhau).
- **Rủi ro kỹ thuật:** Việc phân chia tỷ lệ tiền gốc/khuyến mãi lẻ có thể dẫn đến sai lệch số thập phân nhỏ, cần làm tròn số (round) chuẩn xác trong database.

---

## 7. BƯỚC TIẾP THEO
- Khởi động `/plan` để lên kế hoạch thiết kế chi tiết (Tech Stack, Database Schema, API Flow và Checklists).
