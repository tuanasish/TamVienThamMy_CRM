# 🎨 DESIGN: spa-crm (Hệ Thống CRM Thẩm Mỹ Viện)

**Ngày tạo:** 2026-06-23  
**Dựa trên:** [docs/SPECS.md](file:///e:/Projects/crm/docs/SPECS.md)

---

## 1. Cách Lưu Thông Tin (Database Schema)

Hệ thống sử dụng cơ sở dữ liệu Supabase (PostgreSQL) thông qua Prisma ORM với sơ đồ liên kết các bảng như sau:

```
┌─────────────────────────────────┐
│  👤 CUSTOMER (Khách hàng)       │◀──────────────┐
│  ├── ID, Họ Tên, SĐT, Ngày Sinh │               │
│  └── Hạng (VIP/Gold...), CCCD   │               │
└────────────────┬────────────────┘               │
                 │ 1 khách có                     │
                 │ nhiều hóa đơn                  │
                 ▼                                │ 1 khách sở hữu
┌─────────────────────────────────┐               │ nhiều thẻ/gói
│  🧾 INVOICE (Hóa đơn bán hàng)  │               │
│  ├── Tổng tiền, Loại thanh toán │               │
│  └── Sale phụ trách (Staff ID)  │               │
└────────┬───────────────┬────────┘               │
         │ có 1 lịch     │ chứa nhiều             │
         │ trả góp       │ sản phẩm/dịch vụ       │
         ▼               ▼                        ▼
┌────────────────┐ ┌──────────────┐      ┌─────────────────────────┐
│INSTALLMENT_SCH │ │ INVOICE_ITEM │      │ CUSTOMER_CARD/TREATMENT │
│(Lịch trả góp)  │ │ (Món hàng)   │      │ (Thẻ nạp / Liệu trình)  │
│├── Kỳ đóng tiền│ └───┬──────────┘      │ ├── Số dư gốc / tặng    │
│└── Trạng thái  │     │ thuộc           │ └── Số buổi liệu trình  │
└────────────────┘     │ Dịch vụ/Thẻ nào │            │
                       ▼                              │ 1 thẻ/gói có
                  ┌──────────────┐                    │ nhiều lần dùng
                  │ SERVICE/CARD │                    ▼
                  │ (Dịch vụ/Thẻ)│      ┌─────────────────────────┐
                  └──────────────┘      │ USAGE_LOG (Nhật ký dùng)│
                                        │ ├── Trừ bao nhiêu tiền? │
                                        │ └── Kỹ thuật viên làm?  │
                                        └─────────────────────────┘
```

---

## 2. Danh Sách Màn Hình

| # | Tên Màn Hình | Phân Hệ | Mục Đích |
|---|--------------|---------|----------|
| 1 | Đăng nhập | Chung | Xác thực Nhân viên (Staff) & Khách hàng (Customer) |
| 2 | Trang chủ | Staff | Xem doanh thu ngày, bảng xếp hạng Target Sale, nhắc trả góp |
| 3 | Quản lý Khách hàng | Staff | Danh sách khách hàng, thêm mới khách hàng, lọc theo hạng |
| 4 | Hồ sơ Khách hàng | Staff | Chi tiết thông tin cá nhân, lịch sử giao dịch, thẻ nạp, liệu trình, nhật ký |
| 5 | Lập Hóa Đơn | Staff | Tạo hóa đơn bán dịch vụ/thẻ nạp, chọn trả góp 6/9/12 tháng |
| 6 | Cấu hình dịch vụ/thẻ | Staff | Thêm/Sửa/Xóa dịch vụ và mẫu thẻ tài khoản (Ví dụ: Thẻ 10tr tặng 20tr) |
| 7 | Báo cáo doanh số | Staff | Báo cáo doanh thu, target sale, công nợ, chi phí trả góp/cost |
| 8 | Trang chủ khách hàng | Customer | Xem hạng thành viên, danh sách thẻ nạp, liệu trình đang sở hữu |
| 9 | Chi tiết thẻ nạp | Customer | Xem số dư gốc/tặng còn lại (chia tỷ lệ), nhật ký quẹt tiền |
| 10 | Chi tiết liệu trình | Customer | Xem thanh tiến trình buổi liệu trình dạng phân số `2/6`, nhật ký làm |

---

## 3. Luồng Hoạt Động (Hành Trình Người Dùng)

### 🚶 Luồng 1: Mua thẻ nạp khuyến mãi & Sử dụng thẻ
1. Nhân viên lập hóa đơn cho khách: Chọn Thẻ nạp (Ví dụ: mua thẻ 10tr được 30tr).
2. Hệ thống tạo thẻ `CustomerCard` với: `original_price` = 10tr, `original_value` = 30tr, `current_balance` = 30tr.
3. Khi khách dùng dịch vụ hết 3tr, Nhân viên thực hiện trừ tiền thẻ.
4. Hệ thống trừ `current_balance` còn 27tr. Ghi nhận `UsageLog` với số tiền trừ 3tr.
5. Khách hàng đăng nhập cổng tra cứu, thấy:
   - Tổng số dư còn lại: `27,000,000đ`
   - Tiền gốc còn lại (33.33%): `9,000,000đ`
   - Tiền tặng còn lại (66.67%): `18,000,000đ`

### 🚶 Luồng 2: Khách mua trả góp & Đóng tiền nợ
1. Nhân viên tạo hóa đơn dịch vụ giá 12tr, chọn Trả góp 6 tháng, khách trả trước 2tr.
2. Hệ thống tạo hóa đơn, công nợ khách hàng tăng 10tr.
3. Hệ thống tạo ra 6 kỳ đóng tiền trong bảng `InstallmentSchedule` (5 kỳ đầu: 1.666.667đ, kỳ cuối: 1.666.665đ).
4. Khi khách đóng 1 kỳ, nhân viên bấm xác nhận thanh toán kỳ đó. Công nợ khách giảm đi tương ứng, trạng thái kỳ đó chuyển thành 'paid'.

---

## 4. Checklist Kiểm Tra & Kịch Bản Test (Test Cases)

### 📋 Checklist Tính Năng "Trừ Tiền Thẻ Khuyến Mãi"
- [ ] Bấm trừ tiền thẻ nạp -> hiển thị số dư tổng hiện tại.
- [ ] Cho phép chọn dịch vụ sử dụng để trừ tiền.
- [ ] Nhập số tiền trừ -> số tiền không được lớn hơn tổng số dư hiện tại của thẻ.
- [ ] Bấm xác nhận -> số dư thẻ giảm đi chính xác.
- [ ] Khách hàng đăng nhập -> hiển thị đúng tỷ lệ tiền gốc / tiền tặng còn lại.

### 🧪 Test Cases (Bài Kiểm Tra Giao Dịch)

#### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#### TC-01: Happy Path - Nạp thẻ 10tr được 30tr & Quẹt thẻ lần đầu
#### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Given:** Khách hàng chưa sở hữu thẻ nạp nào.
- **When:** Nhân viên lập hóa đơn bán thẻ nạp giá gốc 10tr, tổng giá trị tài khoản 30tr cho khách. Sau đó quẹt thẻ trừ 3tr cho dịch vụ làm mặt.
- **Then:** 
  - ✓ Hóa đơn tạo thành công.
  - ✓ Thẻ của khách hàng hiển thị tổng số dư còn lại là `27,000,000đ`.
  - ✓ Số dư gốc còn lại hiển thị: `9,000,000đ` ($27tr \times \frac{10}{30}$).
  - ✓ Số dư khuyến mãi còn lại hiển thị: `18,000,000đ` ($27tr \times \frac{20}{30}$).
  - ✓ Tạo đúng 1 dòng nhật ký sử dụng `UsageLog` với số tiền trừ 3tr.

#### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#### TC-02: Validation - Số dư thẻ không đủ để trừ tiền
#### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Given:** Khách sở hữu thẻ nạp có số dư hiện tại là 1,500,000đ.
- **When:** Nhân viên nhập quẹt thẻ trừ 2,000,000đ.
- **Then:**
  - ✓ Hệ thống báo lỗi "Số dư tài khoản thẻ không đủ để thanh toán".
  - ✓ Không cho phép lưu giao dịch quẹt thẻ.
  - ✓ Số dư thẻ của khách giữ nguyên ở mức 1,500,000đ.

#### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#### TC-03: Edge Case - Trả góp 6 tháng cho hóa đơn lẻ tiền (Làm tròn số)
#### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Given:** Khách mua hóa đơn 10,000,000đ trả góp trong 6 tháng.
- **When:** Nhân viên lưu hóa đơn trả góp.
- **Then:**
  - ✓ Hệ thống tự động tạo 6 kỳ trả góp.
  - ✓ Số tiền 5 kỳ đầu tiên là: `1,666,667đ`.
  - ✓ Số tiền kỳ cuối cùng được tự động làm tròn bù trừ là: `1,666,665đ` ($10,000,000 - 1,666,667 \times 5$).
  - ✓ Tổng số tiền 6 kỳ cộng lại chính xác bằng `10,000,000đ` không bị lệch xu nào.

#### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#### TC-04: Tự động phân hạng thành viên khi tích lũy vượt mốc
#### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Given:** Khách hàng đang có tổng chi tiêu lũy kế là 4,500,000đ (Hạng thường).
- **When:** Nhân viên tạo thêm hóa đơn mua thẻ dịch vụ trị giá 1,000,000đ cho khách.
- **Then:**
  - ✓ Tổng chi tiêu lũy kế của khách cập nhật lên `5,500,000đ`.
  - ✓ Hạng thành viên của khách tự động cập nhật lên **Member** (mốc tích lũy >= 5,000,000đ).
