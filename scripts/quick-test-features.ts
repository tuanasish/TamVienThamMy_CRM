import { calculateTier } from "../src/app/api/customers/route";

// 1. Mocking Installment Splitting logic for test verification
function simulateInstallmentSplitting(debtAmount: number, months: number) {
  const baseMonthlyAmount = Math.floor(debtAmount / months);
  let sumCreated = 0;
  const schedules = [];

  for (let i = 1; i <= months; i++) {
    let monthlyAmount = baseMonthlyAmount;
    if (i === months) {
      monthlyAmount = debtAmount - sumCreated;
    } else {
      sumCreated += baseMonthlyAmount;
    }
    schedules.push(monthlyAmount);
  }
  return schedules;
}

// 2. Mocking Card Ratio calculation logic for test verification
function calculateCardBalanceRatio(originalPrice: number, originalValue: number, currentBalance: number) {
  const ratio = originalValue > 0 ? originalPrice / originalValue : 0;
  const actualCash = currentBalance * ratio;
  const promoCash = currentBalance - actualCash;
  return { actualCash, promoCash };
}

// Test Runner
async function runTests() {
  console.log("==================================================");
  console.log("🧪 BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG (QUICK TEST)...");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, message?: string) {
    if (condition) {
      console.log(` ✅ PASS: [${testName}]`);
      passed++;
    } else {
      console.error(` ❌ FAIL: [${testName}] ${message || ""}`);
      failed++;
    }
  }

  // --- HẠNG MỤC 1: KIỂM THỬ PHÂN HẠNG THÀNH VIÊN (MEMBER TIERING) ---
  console.log("\n[1] Kiểm thử tính toán phân hạng thành viên (calculateTier):");
  try {
    assert(calculateTier(0) === "Thường", "Spent 0đ -> Thường");
    assert(calculateTier(4500000) === "Thường", "Spent 4.5Mđ -> Thường");
    assert(calculateTier(5000000) === "Member", "Spent 5Mđ -> Member");
    assert(calculateTier(12000000) === "Silver", "Spent 12Mđ -> Silver");
    assert(calculateTier(25000000) === "Gold", "Spent 25Mđ -> Gold");
    assert(calculateTier(35000000) === "Diamond", "Spent 35Mđ -> Diamond");
    assert(calculateTier(75000000) === "VIP", "Spent 75Mđ -> VIP");
    assert(calculateTier(150000000) === "VIP+", "Spent 150Mđ -> VIP+");
    assert(calculateTier(600000000) === "Business", "Spent 600Mđ -> Business");
    assert(calculateTier(1200000000) === "Business+", "Spent 1.2Bđ -> Business+");
  } catch (err: any) {
    assert(false, "Member Tiering Tests", err.message);
  }

  // --- HẠNG MỤC 2: KIỂM THỬ CHIA LỊCH TRẢ GÓP & LÀM TRÒN LẺ ---
  console.log("\n[2] Kiểm thử chia trả góp và làm tròn số lẻ kỳ cuối:");
  
  // Kịch bản A: Trả góp 10M chia 6 tháng
  const schedules6 = simulateInstallmentSplitting(10000000, 6);
  const sum6 = schedules6.reduce((a, b) => a + b, 0);
  assert(sum6 === 10000000, "Tổng trả góp 6 tháng khớp 10,000,000đ");
  assert(schedules6[0] === 1666666, "5 tháng đầu mỗi tháng đóng 1,666,666đ");
  assert(schedules6[5] === 1666670, "Tháng thứ 6 đóng bù lẻ 1,666,670đ");

  // Kịch bản B: Trả góp 10M chia 9 tháng
  const schedules9 = simulateInstallmentSplitting(10000000, 9);
  const sum9 = schedules9.reduce((a, b) => a + b, 0);
  assert(sum9 === 10000000, "Tổng trả góp 9 tháng khớp 10,000,000đ");
  assert(schedules9[0] === 1111111, "8 tháng đầu mỗi tháng đóng 1,111,111đ");
  assert(schedules9[8] === 1111112, "Tháng thứ 9 đóng bù lẻ 1,111,112đ");

  // Kịch bản C: Trả góp 10M chia 12 tháng
  const schedules12 = simulateInstallmentSplitting(10000000, 12);
  const sum12 = schedules12.reduce((a, b) => a + b, 0);
  assert(sum12 === 10000000, "Tổng trả góp 12 tháng khớp 10,000,000đ");
  assert(schedules12[0] === 833333, "11 tháng đầu mỗi tháng đóng 833,333đ");
  assert(schedules12[11] === 833337, "Tháng thứ 12 đóng bù lẻ 833,337đ");


  // --- HẠNG MỤC 3: KIỂM THỬ PHÂN BỔ DOANH SỐ THẺ NẠP (TIỀN GỐC VS KHUYẾN MÃI) ---
  console.log("\n[3] Kiểm thử phân bổ số dư thẻ nạp (Gốc vs Khuyến mãi):");
  
  // Kịch bản A: Thẻ nạp thực thu 10tr, tài khoản nhận 15tr. Tiêu dùng còn lại 9tr.
  const balanceA = calculateCardBalanceRatio(10000000, 15000000, 9000000);
  assert(balanceA.actualCash === 6000000, "Thẻ 10/15M còn 9M -> Tiền gốc còn 6,000,000đ");
  assert(balanceA.promoCash === 3000000, "Thẻ 10/15M còn 9M -> Tiền khuyến mãi còn 3,000,000đ");

  // Kịch bản B: Thẻ nạp thực thu 5tr, tài khoản nhận 7tr. Tiêu dùng còn lại 3.5tr.
  const balanceB = calculateCardBalanceRatio(5000000, 7000000, 3500000);
  assert(balanceB.actualCash === 2500000, "Thẻ 5/7M còn 3.5M -> Tiền gốc còn 2,500,000đ");
  assert(balanceB.promoCash === 1000000, "Thẻ 5/7M còn 3.5M -> Tiền khuyến mãi còn 1,000,000đ");

  // Kịch bản C: Thẻ nạp thực thu 20tr, tài khoản nhận 50tr. Tiêu dùng còn lại 25tr.
  const balanceC = calculateCardBalanceRatio(20000000, 50000000, 25000000);
  assert(balanceC.actualCash === 10000000, "Thẻ 20/50M còn 25M -> Tiền gốc còn 10,000,000đ");
  assert(balanceC.promoCash === 15000000, "Thẻ 20/50M còn 25M -> Tiền khuyến mãi còn 15,000,000đ");


  console.log("\n==================================================");
  console.log("📊 BÁO CÁO KẾT QUẢ KIỂM THỬ:");
  console.log(` - Đạt (Passed): ${passed} tests`);
  console.log(` - Thất bại (Failed): ${failed} tests`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 CHÚC MỪNG! TẤT CẢ CÁC BÀI KIỂM THỬ ĐỀU THÀNH CÔNG RỰC RỠ!");
    process.exit(0);
  }
}

runTests();
