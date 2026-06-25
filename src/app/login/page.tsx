"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { LogIn, ArrowLeft, Phone, MessageCircle } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

interface Promotion {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  isActive: boolean;
}

// BẢNG GIÁ DỊCH VỤ TRẺ HÓA DA (ĐỒNG BỘ THEO MÀU SẮC CHỦ ĐẠO CỦA TRANG WEB)
interface PricingListProps {
  onRegisterClick: () => void;
}

function PricingListFallback({ onRegisterClick }: PricingListProps) {
  const rows = [
    { name: "Meso không kim Infusion FreshTech", price: "1.000.000", bg: "var(--bg-primary)" },
    { name: "CSD Cấp Tốc LS 2025", price: "1.000.000", bg: "var(--bg-secondary)" },
    { name: "Dr.Young Skin Mặt", price: "8.000.000", bg: "var(--bg-primary)" },
    { name: "Dr.Young Neo Collagen Mặt", price: "14.000.000", bg: "var(--bg-secondary)" },
  ];

  return (
    <div className="pricing-card">
      {/* Header sử dụng dải màu gradient vàng gold của trang web */}
      <div className="pricing-header">
        <span>Dịch vụ trẻ hóa da</span>
        <span>Giá (Vnđ)</span>
        
        {/* Đường răng cưa/sóng lượn màu nền trang để hòa hợp tuyệt đối trong cả Light/Dark Mode */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "12px",
          overflow: "hidden",
          lineHeight: 0,
        }}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: "100%", height: "12px", fill: "var(--bg-primary)" }}>
            <path d="M0,0 C150,90 350,90 500,0 C650,90 850,90 1000,0 C1150,90 1200,0 1200,0 L1200,120 L0,120 Z"></path>
          </svg>
        </div>
      </div>

      {/* Danh sách các dòng dịch vụ */}
      <div style={{ padding: "0.5rem 0" }}>
        {rows.map((row, index) => (
          <div 
            key={index} 
            className="pricing-row"
            style={{
              background: row.bg,
              borderBottom: index === rows.length - 1 ? "none" : "1px solid var(--border-color)",
            }}
          >
            <span>{row.name}</span>
            <span style={{ color: "var(--accent-gold)", fontWeight: 900 }}>{row.price}</span>
          </div>
        ))}
      </div>

      {/* Nút bấm Kích Hoạt Tra Cứu dưới chân Bảng giá */}
      <div className="pricing-footer">
        <button 
          onClick={onRegisterClick}
          className="pricing-cta-btn"
        >
          <LogIn size={16} />
          Đăng Nhập Tra Cứu Liệu Trình
        </button>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "customer"; // default to customer portal

  const [usernameOrPhone, setUsernameOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Trạng thái bật/tắt Popup đăng nhập
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // States for promotions
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const response = await fetch("/api/promotions");
        if (response.ok) {
          const data = await response.json();
          setPromotions(data.filter((p: any) => p.isActive));
        }
      } catch (err) {
        console.error("Error fetching promotions for login page:", err);
      } finally {
        setLoadingPromos(false);
      }
    };
    fetchPromos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernameOrPhone,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      // Redirect depending on role
      if (role === "staff") {
        router.push("/staff");
      } else {
        router.push("/customer");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const feedbackPromo = promotions.find(
    (p) => p.image && p.image.includes(",")
  );
  const bannerPromo = promotions.find(
    (p) => p.image && !p.image.includes(",") && p.id !== feedbackPromo?.id
  );

  const defaultFeedbackPromo = {
    title: "TẤM",
    description: "Hơn 30 sao Việt, 400 doanh nhân và hàng chục nghìn khách hàng chia sẻ những hình ảnh, câu chuyện thực tế khi làm đẹp tại Thẩm Mỹ Viện Tấm",
    image: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=400, https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400, https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=400",
  };

  const activeFeedback = feedbackPromo || defaultFeedbackPromo;

  const feedbackImageUrls = activeFeedback.image
    ? activeFeedback.image.split(",").map((url) => url.trim()).filter(Boolean)
    : [];

  const SPA_CONTACT = {
    phone: "03955 11314",
    phoneRaw: "0395511314",
    messengerUrl: "https://m.me/thammyvientam",
    zaloUrl: "https://zalo.me/0395511314",
  };

  // ==========================================
  // GIAO DIỆN KHÁCH HÀNG (SCROLLABLE LANDING PAGE FLOW)
  // ==========================================
  if (role === "customer") {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "var(--bg-primary)",
      }}>
        {/* 1. THANH TIÊU ĐỀ THƯƠNG HIỆU (STICKY HEADER) */}
        <header className="brand-header">
          <Logo size="medium" />
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="header-login-btn"
          >
            Tra Cứu Liệu Trình
          </button>
        </header>

        {/* 2. KHUNG NỘI DUNG CUỘN CHÍNH */}
        <div className="landing-container">
          {/* PHẦN 1: CHƯƠNG TRÌNH ƯU ĐÃI (BẢNG GIÁ HOẶC BANNER) */}
          {bannerPromo ? (
            <section className="custom-banner-section">
              <div style={{ textAlign: "center" }}>
                <span className="banner-sub">Chương Trình Ưu Đãi Đặc Biệt</span>
                <h3 className="banner-title">{bannerPromo.title}</h3>
                <p className="banner-desc">{bannerPromo.description}</p>
              </div>

              {bannerPromo.image && (
                <div className="banner-image-container">
                  <img src={bannerPromo.image} alt={bannerPromo.title} />
                </div>
              )}
              
              {/* Nút mở popup đăng nhập khi hiển thị banner tùy chỉnh */}
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="banner-cta-btn"
                >
                  <LogIn size={16} />
                  Tra Cứu Lịch Hẹn & Liệu Trình
                </button>
              </div>
            </section>
          ) : (
            <section style={{ textAlign: "center", animation: "fadeInUp 0.6s ease forwards" }}>
              <PricingListFallback onRegisterClick={() => setIsLoginModalOpen(true)} />
            </section>
          )}

          {/* PHẦN 2: NHẬT KÝ KHÁCH HÀNG - REAL STORY */}
          {activeFeedback && (
            <section className="feedback-section">
              {/* Cột trái: Nội dung Feedback */}
              <div className="feedback-left-col">
                <div>
                  <span className="feedback-title">{activeFeedback.title}</span>
                  
                  <div style={{ display: "block", marginTop: "0.4rem" }}>
                    <div className="feedback-badge">Real Story</div>
                  </div>

                  <p className="feedback-desc">{activeFeedback.description}</p>

                  <div 
                    onClick={() => setIsLoginModalOpen(true)}
                    className="feedback-text-link"
                  >
                    Đăng nhập xem chi tiết hồ sơ &gt;
                  </div>
                </div>

                {/* THANH LIÊN HỆ DƯỚI ĐÁY CỘT TRÁI */}
                <div className="feedback-buttons-container">
                  {/* Nút mở popup đăng nhập tra cứu nhanh */}
                  <button 
                    onClick={() => setIsLoginModalOpen(true)}
                    className="feedback-cta-btn"
                  >
                    <LogIn size={13} />
                    TRA CỨU LIỆU TRÌNH
                  </button>

                  {/* Hotline */}
                  <a href={`tel:${SPA_CONTACT.phoneRaw}`} className="feedback-contact-btn gold-solid">
                    <Phone size={13} />
                    {SPA_CONTACT.phone}
                  </a>

                  {/* Zalo */}
                  <a href={SPA_CONTACT.zaloUrl} target="_blank" rel="noopener noreferrer" className="feedback-contact-btn gold-solid">
                    <span style={{ fontSize: "0.78rem", fontWeight: "900", lineHeight: 1 }}>Zalo</span>
                    CHAT ZALO
                  </a>
                </div>
              </div>

              {/* Cột phải: Dàn ảnh Before/After */}
              {feedbackImageUrls.length > 0 && (
                <div className="feedback-right-col">
                  <div className="feedback-image-grid">
                    {feedbackImageUrls.slice(0, 3).map((url, index) => {
                      const labels = ["TRƯỚC KHI LÀM", "SAU 1 BUỔI", "SAU LIỆU TRÌNH"];
                      const badgeColor = index === 0 ? "var(--text-secondary)" : "var(--accent-gold)";
                      return (
                        <div key={index} className="feedback-image-card">
                          <img src={url} alt={`Feedback ${index + 1}`} />
                          <div 
                            className="feedback-image-label" 
                            style={{ background: badgeColor }}
                          >
                            {labels[index] || "KẾT QUẢ"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* 3. POPUP ĐĂNG NHẬP (MODAL OVERLAY) */}
        {isLoginModalOpen && (
          <div 
            className="modal-overlay"
            onClick={() => setIsLoginModalOpen(false)}
          >
            <main 
              className={`${styles.card} modal-card`} 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Nút Đóng (X) */}
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="modal-close-btn"
              >
                &times;
              </button>

              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <Logo size="medium" />
              </div>

              <h2 className={styles.roleTitle} style={{ marginTop: 0, fontSize: "1.25rem", color: "var(--accent-gold)", marginBottom: "0.5rem" }}>
                Cổng Tra Cứu Khách Hàng
              </h2>
              <p style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                textAlign: "center",
                marginBottom: "2.5rem",
                lineHeight: "1.5",
              }}>
                Vui lòng nhập số điện thoại đã đăng ký tại Thẩm Mỹ Viện Tấm để tra cứu liệu trình, hóa đơn và đặt lịch hẹn trực tuyến.
              </p>

              <form className={styles.form} onSubmit={handleSubmit}>
                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.inputGroup}>
                  <label htmlFor="username" className={styles.label}>
                    Số điện thoại của bạn
                  </label>
                  <input
                    id="username"
                    type="tel"
                    className={styles.input}
                    placeholder="Nhập số điện thoại..."
                    value={usernameOrPhone}
                    onChange={(e) => setUsernameOrPhone(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  <LogIn size={18} />
                  {loading ? "Đang kiểm tra..." : "Tra Cứu Ngay"}
                </button>
              </form>

              <a href="/" className={styles.backLink} style={{ marginBottom: 0 }}>
                Quay về Trang chủ
              </a>
            </main>
          </div>
        )}

        {/* HỆ THỐNG CSS PHỤ TRỢ & RESPONSIVE CHUYÊN NGHIỆP */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }

          /* Sticky Header Styles */
          .brand-header {
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            padding: 0.8rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: var(--shadow-sm);
          }

          .header-login-btn {
            background: var(--grad-premium);
            color: #ffffff;
            border: none;
            padding: 0.55rem 1.25rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: var(--shadow-sm);
            transition: all 0.2s ease;
          }

          .header-login-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }

          /* Body Container Styles */
          .landing-container {
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
            padding: 3rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 4rem;
            flex: 1;
          }

          /* Pricing Card Styles */
          .pricing-card {
            max-width: 640px;
            width: 100%;
            margin: 0 auto;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-md);
            background: var(--bg-primary);
            animation: fadeInUp 0.6s ease forwards;
          }

          .pricing-header {
            background: var(--grad-premium);
            color: #ffffff;
            padding: 1.5rem 2rem 2rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
          }

          .pricing-header span {
            font-size: 1.25rem;
            font-weight: 800;
            font-family: var(--font-sans);
            letter-spacing: 0.02em;
          }

          .pricing-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 2rem;
            font-size: 0.98rem;
            font-weight: 700;
            color: var(--text-primary);
            font-family: var(--font-sans);
          }

          .pricing-footer {
            padding: 1.5rem 2rem;
            text-align: center;
            border-top: 1px solid var(--border-color);
          }

          .pricing-cta-btn {
            background: var(--grad-premium);
            color: #ffffff;
            border: none;
            width: 100%;
            padding: 0.85rem;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: var(--shadow-sm);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }

          .pricing-cta-btn:hover {
            opacity: 0.95;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(223, 183, 108, 0.25);
          }

          /* Custom Banner Styles */
          .custom-banner-section {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 2.5rem 2rem;
            box-shadow: var(--shadow-sm);
            animation: fadeInUp 0.6s ease forwards;
          }

          .banner-sub {
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--accent-gold);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .banner-title {
            font-size: 1.6rem;
            font-weight: 800;
            color: var(--text-primary);
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
          }

          .banner-desc {
            font-size: 0.95rem;
            color: var(--text-secondary);
            max-width: 700px;
            margin: 0 auto;
            line-height: 1.6;
            white-space: pre-wrap;
          }

          .banner-image-container {
            border-radius: 12px;
            overflow: hidden;
            box-shadow: var(--shadow-md);
            border: 1px solid var(--border-color);
            max-height: 550px;
            width: 100%;
            display: flex;
            justify-content: center;
            background: rgba(0,0,0,0.02);
          }

          .banner-image-container img {
            max-width: 100%;
            height: auto;
            max-height: 550px;
            object-fit: contain;
          }

          .banner-cta-btn {
            background: var(--grad-premium);
            color: #ffffff;
            border: none;
            padding: 0.85rem 2.5rem;
            border-radius: 30px;
            font-size: 0.95rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: var(--shadow-md);
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
          }

          .banner-cta-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }

          /* Feedback Section Styles */
          .feedback-section {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 3rem 2.5rem;
            box-shadow: var(--shadow-md);
            display: grid;
            grid-template-columns: 1fr 1.25fr;
            gap: 2.5rem;
            align-items: center;
            animation: fadeInUp 0.8s ease forwards;
          }

          .feedback-left-col {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 380px;
          }

          .feedback-title {
            font-family: 'Playfair Display', serif;
            font-size: 1.6rem;
            font-weight: 800;
            color: var(--accent-gold);
            letter-spacing: 0.08em;
            display: block;
          }

          .feedback-badge {
            background: var(--grad-premium);
            color: #ffffff;
            padding: 0.3rem 1.1rem;
            font-size: 1.5rem;
            font-weight: bold;
            font-family: var(--font-sans);
            font-style: italic;
            display: inline-block;
            border-radius: 4px;
            transform: rotate(-1deg);
            box-shadow: 2px 2px 6px rgba(0,0,0,0.15);
          }

          .feedback-desc {
            font-size: 0.92rem;
            color: var(--text-secondary);
            line-height: 1.6;
            white-space: pre-wrap;
            margin-top: 2rem;
            font-family: var(--font-sans);
            max-height: 180px;
            overflow-y: auto;
          }

          .feedback-text-link {
            color: var(--accent-gold);
            font-weight: 700;
            font-size: 0.85rem;
            margin-top: 1.5rem;
            cursor: pointer;
            transition: color 0.2s;
          }

          .feedback-text-link:hover {
            color: var(--accent-gold-hover);
          }

          .feedback-buttons-container {
            display: flex;
            gap: 0.35rem;
            flex-wrap: wrap;
            margin-top: 2rem;
            width: 100%;
          }

          .feedback-cta-btn {
            background: var(--grad-premium);
            color: #ffffff;
            border: none;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.55rem 0.85rem;
            border-radius: 4px;
            font-size: 0.78rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .feedback-cta-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }

          .feedback-contact-btn {
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.55rem 0.85rem;
            border-radius: 4px;
            font-size: 0.78rem;
            font-weight: bold;
            text-decoration: none;
            transition: all 0.2s ease;
          }

          .feedback-contact-btn.gold-solid {
            background: var(--accent-gold);
          }

          .feedback-contact-btn.gold-solid:hover {
            background-color: var(--accent-gold-hover);
            transform: translateY(-1px);
          }

          /* Feedback Right Column / Photo Grid */
          .feedback-right-col {
            background: rgba(223, 183, 108, 0.04);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            padding: 1.5rem 1rem;
            display: flex;
            align-items: center;
          }

          .feedback-image-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
            width: 100%;
          }

          .feedback-image-card {
            position: relative;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid var(--border-color);
            background: var(--bg-primary);
            aspect-ratio: 3/4;
            box-shadow: var(--shadow-sm);
          }

          .feedback-image-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .feedback-image-label {
            position: absolute;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
            color: #ffffff;
            font-size: 0.58rem;
            font-weight: bold;
            padding: 0.2rem 0.4rem;
            border-radius: 20px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }

          /* Modal Popup Styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            padding: 1rem;
            animation: fadeIn 0.25s ease forwards;
          }

          .modal-card {
            max-width: 420px;
            width: 100%;
            position: relative;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(223, 183, 108, 0.3) !important;
            animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          .modal-close-btn {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 1.8rem;
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
            line-height: 1;
            z-index: 10;
          }

          .modal-close-btn:hover {
            color: var(--accent-gold);
            background: rgba(223, 183, 108, 0.1);
          }

          /* ==========================================
             RESPONSIVE OPTIMIZATION
             ========================================== */
          @media (max-width: 768px) {
            .brand-header {
              padding: 0.8rem 1rem;
            }

            .landing-container {
              padding: 1.5rem 1rem;
              gap: 2.5rem;
            }

            .pricing-header {
              padding: 1.2rem 1.2rem 1.8rem 1.2rem;
            }

            .pricing-header span {
              font-size: 1.05rem;
            }

            .pricing-row {
              padding: 1rem 1.2rem;
              font-size: 0.88rem;
            }

            .pricing-footer {
              padding: 1.2rem;
            }

            .feedback-section {
              grid-template-columns: 1fr !important;
              padding: 1.5rem 1.2rem;
              gap: 1.5rem;
            }

            .feedback-left-col {
              min-height: auto;
            }

            .feedback-title {
              font-size: 1.4rem;
            }

            .feedback-badge {
              font-size: 1.2rem;
              padding: 0.2rem 0.8rem;
            }

            .feedback-desc {
              margin-top: 1rem;
              max-height: 140px;
            }

            .feedback-buttons-container {
              margin-top: 1.5rem;
              gap: 0.3rem;
            }

            .feedback-cta-btn, .feedback-contact-btn {
              padding: 0.5rem 0.7rem;
              font-size: 0.72rem;
            }

            .feedback-right-col {
              padding: 1rem 0.75rem;
            }

            .feedback-image-grid {
              gap: 0.5rem;
            }

            .feedback-image-label {
              font-size: 0.5rem;
              padding: 0.15rem 0.35rem;
              bottom: 6px;
            }
          }

          @media (max-width: 480px) {
            .pricing-header span {
              font-size: 0.95rem;
            }
            .pricing-row {
              padding: 0.85rem 0.9rem;
              font-size: 0.82rem;
            }
            .feedback-image-label {
              font-size: 0.45rem;
              padding: 0.1rem 0.25rem;
            }
            .modal-card {
              padding: 2rem 1.5rem;
            }
          }
        `}} />

        {/* 4. FOOTER THƯƠNG HIỆU */}
        <Footer />
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN NHÂN VIÊN (CHỈ CÓ CARD LOGIN CĂN GIỮA NHƯ CŨ)
  // ==========================================
  return (
    <div className={styles.container}>
      <main className={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <Logo size="large" />
        </div>
        <h2 className={styles.roleTitle} style={{ marginTop: 0 }}>
          Đăng nhập - Phân hệ Nhân viên
        </h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>
              Tên tài khoản (username)
            </label>
            <input
              id="username"
              type="text"
              className={styles.input}
              placeholder="Nhập tên tài khoản"
              value={usernameOrPhone}
              onChange={(e) => setUsernameOrPhone(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            <LogIn size={18} />
            {loading ? "Đang xác thực..." : "Đăng Nhập"}
          </button>
        </form>

        <a href="/" className={styles.backLink}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <ArrowLeft size={16} /> Quay về Trang chủ
          </div>
        </a>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh", 
        backgroundColor: "var(--bg-primary)" 
      }}>
        <div style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-lg)",
          padding: "3rem 2rem",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          color: "var(--text-primary)",
        }}>
          Đang tải thông tin...
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
