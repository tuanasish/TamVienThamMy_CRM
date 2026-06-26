"use client";

import React from "react";
import Logo from "./Logo";
import { Phone, MapPin, Clock, MessageCircle, Globe } from "lucide-react";

export default function Footer() {
  const hotline = "03955 11314";
  const hotlineRaw = "0395511314";
  const zaloUrl = `https://zalo.me/${hotlineRaw}`;
  const messengerUrl = "https://m.me/thammyvientam"; // Link Messenger mặc định

  return (
    <footer style={{
      background: "var(--bg-secondary)",
      borderTop: "1px solid var(--border-color)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans)",
      position: "relative",
      width: "100%",
      marginTop: "auto",
    }}>
      {/* Khung chứa chính */}
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "4rem 2rem 2.5rem 2rem",
      }}>
        {/* Phần lưới thông tin */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "2.5rem",
          marginBottom: "3rem",
        }}>
          {/* Cột 1: Thương hiệu */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div>
              <Logo size="small" />
            </div>
            <p style={{
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              lineHeight: "1.6",
              maxWidth: "320px",
            }}>
              Viện Thẩm Mỹ Tấm. Nơi lưu giữ nét xuân, đồng hành cùng bạn trên hành trình chăm sóc và nâng niu vẻ đẹp tự nhiên một cách hoàn hảo nhất.
            </p>
          </div>

          {/* Cột 2: Thông tin liên hệ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h4 style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--accent-gold)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              position: "relative",
              paddingBottom: "0.5rem",
            }}>
              Thông tin liên hệ
              <span style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "40px",
                height: "2px",
                background: "var(--grad-premium)"
              }} />
            </h4>
            
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.8rem", padding: 0 }}>
              <li style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.9rem" }}>
                <MapPin size={16} style={{ color: "var(--accent-gold)", marginTop: "0.2rem", flexShrink: 0 }} />
                <span style={{ color: "var(--text-secondary)" }}>50 Trần Nhật Duật, Phường Cam Ly, Đà Lạt</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.9rem" }}>
                <Phone size={16} style={{ color: "var(--accent-gold)", flexShrink: 0 }} />
                <a 
                  href={`tel:${hotlineRaw}`} 
                  style={{ 
                    color: "var(--text-primary)", 
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "color 0.2s" 
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-gold)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                >
                  {hotline}
                </a>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.9rem" }}>
                <Clock size={16} style={{ color: "var(--accent-gold)", flexShrink: 0 }} />
                <span style={{ color: "var(--text-secondary)" }}>8h30-20h (Tất cả các ngày trong tuần)</span>
              </li>
            </ul>
          </div>

          {/* Cột 3: Kết nối & Nhận tư vấn */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h4 style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--accent-gold)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              position: "relative",
              paddingBottom: "0.5rem",
            }}>
              Kết nối với chúng tôi
              <span style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "40px",
                height: "2px",
                background: "var(--grad-premium)"
              }} />
            </h4>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Liên hệ trực tuyến để đặt lịch hẹn nhanh chóng và nhận nhiều ưu đãi độc quyền hấp dẫn.
            </p>
            
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.3rem" }}>
              {/* Nút Zalo */}
              <a 
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--accent-gold)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  transition: "all 0.2s ease",
                  boxShadow: "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--grad-premium)";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.borderColor = "transparent";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--glass-bg)";
                  e.currentTarget.style.color = "var(--accent-gold)";
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                }}
              >
                <MessageCircle size={16} />
                Chat Zalo
              </a>

              {/* Nút Hotline */}
              <a 
                href={`tel:${hotlineRaw}`}
                style={{
                  background: "var(--grad-premium)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  transition: "opacity 0.2s ease",
                  boxShadow: "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                <Phone size={14} />
                Gọi Hotline
              </a>
            </div>
          </div>
        </div>

        {/* Đường kẻ ngang ngăn cách */}
        <div style={{
          height: "1px",
          background: "var(--border-color)",
          width: "100%",
          marginBottom: "1.5rem",
        }} />

        {/* Thanh bản quyền */}
        <div style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}>
          <div>
            © 2026 <strong>Viện Thẩm Mỹ Tấm</strong>. Bảo lưu mọi quyền.
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Globe size={12} />
              Tiêu chuẩn Premium
            </span>
          </div>
        </div>
      </div>
      
      {/* CSS phụ trợ cho Mobile Bottom Nav tránh đè lên footer */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          footer {
            padding-bottom: 5.5rem !important; /* Đẩy footer lên cao hơn thanh BottomNav của điện thoại */
          }
        }
      `}} />
    </footer>
  );
}
