# Ý Tưởng Dự Án: CRM Thẩm Mỹ Viện (spa-crm)

Dưới đây là các yêu cầu chức năng được ghi nhận từ hình ảnh thiết kế sơ bộ:

## 1. Khách Hàng (Customer Management)
- **Tạo mới khách hàng**:
  - Số điện thoại (sđt)
  - Ngày tháng năm sinh
  - Địa chỉ
  - Giới tính
  - Số CCCD
  - Ghi chú riêng cho từng khách hàng (note)
- **Danh sách khách hàng & Phân hạng thành viên**:
  - Tự động/thủ công xếp hạng dựa trên lịch sử chi tiêu:
    - **Member**: 5 triệu
    - **Silver**: 10 triệu
    - **Gold**: 20 triệu
    - **Diamond**: 30 triệu
    - **VIP**: 50 triệu
    - **VIP+**: 100 triệu
    - **Business**: 500 triệu
    - **Business+**: 1 tỷ
  - Theo dõi lịch sử chi tiêu của từng khách hàng.

## 2. Doanh Số & Bán Hàng (Sales & Daily Operations)
- **Hóa đơn bán hàng**:
  - Nhập trong hóa đơn bán hàng của từng khách hàng theo từng ngày.
  - Hỗ trợ nhập doanh thu trả góp theo kỳ hạn: **6 tháng**, **9 tháng**, **12 tháng**.
- **Chương trình khuyến mãi**:
  - Áp dụng giảm giá, khuyến mãi trực tiếp trên hóa đơn.
- **Quản lý Sale**:
  - Gắn doanh số cho nhân viên sale (tick doanh số cho sale).
- **Sản phẩm & Dịch vụ bán trong ngày**:
  - Nhập thông tin sản phẩm/dịch vụ hôm nay sale bán cho khách hàng.
- **Note nội bộ**:
  - Có chỗ để ghi chú nội bộ trên từng giao dịch/hóa đơn.

## 3. Báo Cáo (Reporting & Analytics)
- **Báo cáo doanh thu**:
  - Theo ngày, tuần, tháng, năm.
  - So sánh doanh thu cùng kỳ (năm trước/tháng trước).
- **Quản lý mục tiêu (Target)**:
  - Theo dõi target doanh số của từng nhân viên sale.
- **Báo cáo chi phí**:
  - Báo cáo chi phí trả góp.
  - Báo cáo chi phí cost (giá vốn dịch vụ/sản phẩm).
- **Tiền nợ**:
  - Thống kê công nợ của khách hàng.

## 4. Điều Khiển / Cấu Hình Hệ Thống (Admin Control Panel)
- **Quản lý Dịch vụ**:
  - Tạo mới dịch vụ để sale bán hàng.
  - Cấu trúc dịch vụ: `Tên dịch vụ`, `Giá`, `Tag đi kèm`.
- **Quản lý Thẻ (Thẻ thành viên / Thẻ tài khoản trả trước)**:
  - Tạo mới thẻ và định cấu hình thẻ (ví dụ: mua thẻ 5tr, 10tr...).
  - Cơ chế nhân số dư / khuyến mãi:
    - Nạp thẻ 10tr được 15tr trong tài khoản.
    - Nạp thẻ 10tr được 30tr trong tài khoản (tùy cấu hình khuyến mãi).
  - Cấu trúc thẻ: `Tên thẻ`, `Giá gốc`, `Giá trị tăng thêm (số dư được dùng)`, `Các dịch vụ được áp dụng`.

## 5. Khách Hàng Đăng Nhập (Customer Portal)
- Khách hàng tự đăng nhập để tra cứu dịch vụ/thẻ đã mua:
  - **Lịch sử mua hàng**: Đã mua những gì, đã sử dụng những gì, ngày làm dịch vụ.
  - **Số dư tài khoản thẻ**:
    - Thể hiện rõ giá mua thực tế (giá trị gốc) là bao nhiêu, được khuyến mãi bao nhiêu.
    - Đã dùng những dịch vụ gì (kèm ngày sử dụng), số tiền đã trừ.
    - Số tiền còn lại trong thẻ (trừ dần trên tổng số tiền bao gồm cả khuyến mãi).
  - **Dịch vụ dùng 1 lần**:
    - Biết rõ mua ngày nào, trạng thái đã dùng hay chưa sử dụng.
  - **Dịch vụ dùng nhiều lần (Liệu trình)**:
    - Thể hiện ngày mua, số lần đã dùng trên tổng số lần (ví dụ: mua gói 5 lần tặng 1 lần -> tổng 6 lần, đã dùng 2 lần thì hiển thị trạng thái `2/6`).
