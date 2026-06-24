import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seeding...");

  // Clear existing data to avoid conflicts
  await prisma.usageLog.deleteMany({});
  await prisma.installmentSchedule.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.customerCard.deleteMany({});
  await prisma.customerTreatment.deleteMany({});
  await prisma.cardTemplate.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.staff.deleteMany({});

  console.log("🧹 Cleared old database records.");

  // Hash standard password for testing
  const passwordHash = await bcrypt.hash("123456", 10);

  // 1. Create Staff Members
  const staff1 = await prisma.staff.create({
    data: {
      username: "lan.staff",
      passwordHash,
      fullName: "Lễ tân Lan",
      role: "staff",
    },
  });

  const staff2 = await prisma.staff.create({
    data: {
      username: "hoa.sale",
      passwordHash,
      fullName: "Sale Hoa",
      role: "staff",
    },
  });

  console.log("👤 Created staff accounts:", [staff1.username, staff2.username]);

  // 2. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      phone: "0912345678",
      passwordHash,
      fullName: "Nguyễn Vy",
      dob: new Date("1995-10-15"),
      address: "123 Đường Ba Tháng Hai, Quận 10, TP.HCM",
      gender: "Nữ",
      cccd: "079195000123",
      notes: "Da nhạy cảm, dễ dị ứng cồn mỹ phẩm",
      totalSpent: 0,
      tier: "Member",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      phone: "0987654321",
      passwordHash,
      fullName: "Trần Minh",
      dob: new Date("1988-05-20"),
      address: "456 Nguyễn Thị Minh Khai, Quận 3, TP.HCM",
      gender: "Nam",
      cccd: "079188000456",
      notes: "Hay đi dịch vụ vào cuối tuần",
      totalSpent: 0,
      tier: "Member",
    },
  });

  console.log("👥 Created customers:", [customer1.fullName, customer2.fullName]);

  // 3. Create Services
  const service1 = await prisma.service.create({
    data: {
      name: "Chăm sóc da cơ bản",
      price: 500000,
      tags: JSON.stringify(["skincare", "basic"]),
    },
  });

  const service2 = await prisma.service.create({
    data: {
      name: "Chăm sóc da mặt chuyên sâu",
      price: 1500000,
      tags: JSON.stringify(["skincare", "facial"]),
    },
  });

  const service3 = await prisma.service.create({
    data: {
      name: "Triệt lông body vĩnh viễn",
      price: 3000000,
      tags: JSON.stringify(["body", "laser"]),
    },
  });

  const service4 = await prisma.service.create({
    data: {
      name: "Tắm trắng toàn thân phi thuyền",
      price: 5000000,
      tags: JSON.stringify(["body", "premium"]),
    },
  });

  const service5 = await prisma.service.create({
    data: {
      name: "Massage body đá nóng",
      price: 800000,
      tags: JSON.stringify(["massage", "body"]),
    },
  });

  console.log("💆 Created spa services.");

  // 4. Create Card Templates
  const template1 = await prisma.cardTemplate.create({
    data: {
      name: "Thẻ Bạc 5M (Tài khoản 7M)",
      price: 5000000,
      value: 7000000,
      services: JSON.stringify([]), // All services
    },
  });

  const template2 = await prisma.cardTemplate.create({
    data: {
      name: "Thẻ Vàng 10M (Tài khoản 15M)",
      price: 10000000,
      value: 15000000,
      services: JSON.stringify([]),
    },
  });

  const template3 = await prisma.cardTemplate.create({
    data: {
      name: "Thẻ Kim Cương 20M (Tài khoản 50M)",
      price: 20000000,
      value: 50000000,
      services: JSON.stringify([]),
    },
  });

  console.log("💳 Created card templates.");

  // 5. Create Sample Promotions
  const promo1 = await prisma.promotion.create({
    data: {
      title: "Combo Sáng Mịn Toàn Diện - Giảm 50%",
      description: "Liệu trình chăm sóc da mặt chuyên sâu kết hợp đắp mặt nạ tinh chất Collagen tươi giúp căng bóng, sáng mịn tức thì. Chỉ áp dụng cho khách hàng đăng ký online giữ ưu đãi hôm nay.",
      isActive: true,
    },
  });

  const promo2 = await prisma.promotion.create({
    data: {
      title: "Ưu đãi Vàng - Tặng Thẻ Nạp Trị Giá 5.000.000đ",
      description: "Khi mua Thẻ nạp tài khoản 10M, nhận ngay số dư khả dụng lên tới 15.000.000đ để thoải mái sử dụng tất cả dịch vụ tại Spa. Đăng ký ngay để chuyên viên giữ suất khuyến mãi cho bạn.",
      isActive: true,
    },
  });

  const promo3 = await prisma.promotion.create({
    data: {
      title: "Liệu trình Triệt Lông Toàn Thân - Mua 1 Tặng 1",
      description: "Đăng ký liệu trình triệt lông body vĩnh viễn bằng công nghệ Diode Laser hiện đại nhất hiện nay. Tặng thêm 1 liệu trình massage body đá nóng thư giãn trị giá 800.000đ.",
      isActive: true,
    },
  });

  console.log("🎁 Created promotions.");
  console.log("🎉 Seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
