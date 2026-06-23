# Kế Hoạch Xây Dựng: spa-crm (Web App CRM Thẩm Mỹ Viện)

**Ngày tạo:** 2026-06-23  
**Trạng thái:** 🟡 Đang thực hiện  
**Công nghệ:** Next.js + Supabase (PostgreSQL) + Prisma ORM  

---

## 📋 TỔNG QUAN DỰ ÁN
Dự án nhằm xây dựng một hệ thống Web App quản lý quan hệ khách hàng (CRM) cho thẩm mỹ viện, hỗ trợ quản lý thẻ liệu trình nạp trước, hóa đơn trả góp, báo cáo tài chính/target sale và cung cấp cổng tra cứu cá nhân cho khách hàng qua số điện thoại.

---

## 📈 DANH SÁCH CÁC GIAI ĐOẠN (PHASES)

| Phase | Tên giai đoạn | Trạng thái | Tiến độ | Mô tả chi tiết |
|-------|---------------|------------|---------|----------------|
| 01 | [Setup Môi Trường](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-01-setup.md) | ✅ Hoàn thành | 100% | Khởi tạo Next.js, cài đặt thư viện và cấu hình dự án. |
| 02 | [Database & Supabase](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-02-database.md) | ✅ Hoàn thành | 100% | Cấu hình Supabase PostgreSQL, thiết lập Prisma schema và migrate. |
| 03 | [Backend API](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-03-backend.md) | ✅ Hoàn thành | 100% | Xây dựng các API Endpoint xử lý CRUD, Auth, nạp thẻ và lịch trả góp. |
| 04 | [Giao Diện Frontend](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-04-frontend.md) | ✅ Hoàn thành | 100% | Xây dựng các trang Dashboard cho nhân viên và cổng tra cứu khách hàng. |
| 05 | [Tích Hợp Hệ Thống](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-05-integration.md) | ✅ Hoàn thành | 100% | Kết nối các form Frontend với API Backend và tối ưu hóa trải nghiệm. |
| 06 | [Kiểm Thử & Hoàn Thiện](file:///e:/Projects/crm/plans/260623-2143-spa-crm-mvp/phase-06-testing.md) | ⬜ Chưa bắt đầu | 0% | Viết kịch bản kiểm thử luồng hóa đơn trả góp, trừ thẻ tài khoản và báo cáo. |

---

## 🛠️ LỆNH NHANH (QUICK COMMANDS)
- Bắt đầu Phase 1: `/code phase-01`
- Kiểm tra tiến độ: `/next`
- Lưu lại context: `/save-brain`
