"use client";

import { useState, useEffect } from "react";
import { X, Phone, MessageCircle } from "lucide-react";
import Logo from "./Logo";

// HƯỚNG DẪN DÀNH CHO NHÂN VIÊN:
// Để cấu hình hiển thị 3 ảnh Trước/Sau (Before/After) như trong ảnh mẫu:
// Khi tạo hoặc sửa Chương trình ưu đãi ở trang quản trị, tại ô "Ảnh ưu đãi (URL)", 
// hãy nhập 3 link ảnh cách nhau bằng dấu phẩy. Ví dụ:
// https://link-anh-truoc.jpg, https://link-anh-sau-1-buoi.jpg, https://link-anh-hoan-thanh.jpg
// Nếu chỉ nhập 1 link ảnh, hệ thống sẽ tự động hiển thị dưới dạng 1 banner lớn duy nhất.

// Cấu hình thông tin liên hệ của Spa
const SPA_CONTACT = {
  phone: "03955 11314",
  phoneRaw: "0395511314",
  messengerUrl: "https://m.me/thammyvientam", // Link chat Messenger của fanpage
  zaloUrl: "https://zalo.me/0395511314",       // Link chat Zalo của Spa
};

interface Promotion {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  isActive: boolean;
}

export default function MarketingPopup() {
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra xem người dùng đã xem banner này trong session hiện tại chưa
    const hasSeen = sessionStorage.getItem("has_seen_marketing_popup");
    if (hasSeen) return;

    // 2. Lấy danh sách ưu đãi từ API
    const fetchLatestPromo = async () => {
      try {
        const response = await fetch("/api/promotions");
        if (!response.ok) return;
        const data: Promotion[] = await response.json();
        
        // Tìm ưu đãi mới nhất đang được kích hoạt (isActive === true)
        const activePromo = data.find((p) => p.isActive);
        if (activePromo) {
          setPromo(activePromo);
          // Tự động mở popup sau 1.5 giây để tạo hiệu ứng mượt mà
          const timer = setTimeout(() => {
            setIsOpen(true);
            sessionStorage.setItem("has_seen_marketing_popup", "true");
          }, 1500);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error("Error fetching marketing promo:", err);
      }
    };

    fetchLatestPromo();
  }, []);

  if (!isOpen || !promo) return null;

  // Xử lý tách các đường dẫn ảnh nếu nhân viên nhập nhiều ảnh (cách nhau bởi dấu phẩy)
  const imageUrls = promo.image
    ? promo.image.split(",").map((url) => url.trim()).filter(Boolean)
    : [];

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: "1rem",
    }}>
      <div style={{
        background: "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
        width: "100%",
        maxWidth: "960px",
        borderRadius: "20px",
        boxShadow: "var(--shadow-md), 0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        position: "relative",
        display: "grid",
        gridTemplateColumns: imageUrls.length > 0 ? "1.1fr 1.4fr" : "1fr",
        animation: "popupScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}>
        {/* CSS Animation inline */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes popupScaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}} />

        {/* Nút đóng Popup */}
        <button 
          onClick={() => setIsOpen(false)}
          style={{
            position: "absolute",
            right: "15px",
            top: "15px",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-primary)",
            zIndex: 10,
            transition: "all 0.2s",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--grad-premium)";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--glass-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          title="Đóng quảng cáo"
        >
          <X size={18} />
        </button>

        {/* CỘT TRÁI: NỘI DUNG & THÔNG TIN LIÊN HỆ */}
        <div style={{
          padding: "2.5rem 2.25rem 2.25rem 2.25rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "450px",
        }}>
          <div>
            {/* Logo Thương hiệu tích hợp từ hệ thống */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "0.5rem" }}>
              <Logo size="medium" />
            </div>
            
            {/* Nhãn Real Story đồng bộ với Gold Theme */}
            <div style={{
              background: "var(--grad-premium)",
              color: "#ffffff",
              padding: "0.3rem 1rem",
              fontSize: "1.5rem",
              fontWeight: "bold",
              fontFamily: "var(--font-sans)",
              fontStyle: "italic",
              display: "inline-block",
              marginTop: "0.2rem",
              borderRadius: "4px",
              transform: "rotate(-1deg)",
              boxShadow: "2px 2px 6px rgba(0,0,0,0.15)",
            }}>
              Real Story
            </div>

            {/* Nội dung thay đổi động theo form của nhân viên */}
            <div style={{ marginTop: "2rem" }}>
              <h4 style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "var(--accent-gold)",
                lineHeight: 1.4,
                marginBottom: "0.75rem",
              }}>
                {promo.title}
              </h4>
              <p style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                maxHeight: "220px",
                overflowY: "auto",
                paddingRight: "5px",
              }}>
                {promo.description}
              </p>
            </div>
          </div>

          {/* THANH LIÊN HỆ DƯỚI ĐÁY */}
          <div style={{
            display: "flex",
            gap: "0.35rem",
            flexWrap: "wrap",
            marginTop: "2.5rem",
            width: "100%",
          }}>
            {/* Số điện thoại Hotline */}
            <a 
              href={`tel:${SPA_CONTACT.phoneRaw}`}
              style={{
                background: "var(--accent-gold)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.78rem",
                fontWeight: "bold",
                textDecoration: "none",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-gold-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--accent-gold)"}
            >
              <Phone size={13} />
              {SPA_CONTACT.phone}
            </a>

            {/* Chat Facebook Messenger */}
            <a 
              href={SPA_CONTACT.messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "var(--accent-gold)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.78rem",
                fontWeight: "bold",
                textDecoration: "none",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-gold-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--accent-gold)"}
            >
              <MessageCircle size={13} />
              CHAT NGAY
            </a>

            {/* Chat Zalo */}
            <a 
              href={SPA_CONTACT.zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "var(--accent-gold)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.78rem",
                fontWeight: "bold",
                textDecoration: "none",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-gold-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--accent-gold)"}
            >
              <span style={{ fontSize: "0.78rem", fontWeight: "900", lineHeight: 1 }}>Zalo</span>
              CHAT ZALO
            </a>
          </div>
        </div>

        {/* CỘT PHẢI: HÌNH ẢNH BANNER HOẶC DÀN ẢNH SO SÁNH TRƯỚC/SAU */}
        {imageUrls.length > 0 && (
          <div style={{
            background: "rgba(223, 183, 108, 0.04)",
            borderLeft: "1px solid var(--border-color)",
            padding: "2.5rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {/* Kiểm tra nếu có từ 2 ảnh trở lên -> hiển thị dàn ảnh so sánh dạng cột cạnh nhau */}
            {imageUrls.length > 1 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(imageUrls.length, 3)}, 1fr)`,
                gap: "0.75rem",
                width: "100%",
              }}>
                {imageUrls.slice(0, 3).map((url, index) => {
                  // Đặt nhãn tự động giống thiết kế gốc
                  const labels = ["TRƯỚC KHI LÀM", "SAU 1 BUỔI", "SAU LIỆU TRÌNH"];
                  const badgeColor = index === 0 ? "var(--text-secondary)" : "var(--accent-gold)";
                  return (
                    <div key={index} style={{
                      position: "relative",
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: "1px solid var(--border-color)",
                      boxShadow: "var(--shadow-sm)",
                      background: "var(--bg-primary)",
                      aspectRatio: "3/4",
                    }}>
                      <img 
                        src={url} 
                        alt={`Khách hàng trải nghiệm ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      {/* Nhãn đè lên ảnh ở dưới đáy */}
                      <div style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: badgeColor,
                        color: "#ffffff",
                        fontSize: "0.62rem",
                        fontWeight: "bold",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "20px",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        letterSpacing: "0.02em",
                      }}>
                        {labels[index] || "KẾT QUẢ"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Nếu chỉ có 1 ảnh duy nhất -> hiển thị banner lớn chiếm trọn cột phải
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid var(--border-color)",
              }}>
                <img 
                  src={imageUrls[0]} 
                  alt={promo.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
