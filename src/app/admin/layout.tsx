"use client";

import { usePathname } from "next/navigation";
import { getAuthService } from "@/services";
import AdminAuth from "@/components/admin/AdminAuth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const authService = getAuthService();
      await authService.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Bypass authentication for the create-user utility page
  if (pathname === "/admin/create-user") {
    return (
      <div
        style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}
        data-oid="whnijy."
      >
        {children}
      </div>
    );
  }

  return (
    <AdminAuth data-oid="b2-0cee">
      <div
        style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}
        data-oid="8t9ym4z"
      >
        {/* Admin Navigation Bar */}
        <header
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          data-oid="2jiq:on"
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "1rem 2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            data-oid="hs85_8e"
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "2rem" }}
              data-oid="uiiiy_1"
            >
              <a
                href="/admin"
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: "#111827",
                  textDecoration: "none",
                }}
                data-oid="t3b2bv0"
              >
                🐱 Admin
              </a>
              <nav style={{ display: "flex", gap: "1rem" }} data-oid="viu778z">
                <a
                  href="/admin"
                  style={{
                    padding: "0.5rem 1rem",
                    color: "#6b7280",
                    textDecoration: "none",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  data-oid="l1y0wkd"
                >
                  관리자 대쉬보드
                </a>
                <a
                  href="/admin/posts"
                  style={{
                    padding: "0.5rem 1rem",
                    color: "#6b7280",
                    textDecoration: "none",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  data-oid="post_mgmt"
                >
                  게시물 관리
                </a>
                <a
                  href="/admin/cats"
                  style={{
                    padding: "0.5rem 1rem",
                    color: "#6b7280",
                    textDecoration: "none",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  data-oid="cat_mgmt"
                >
                  고양이 관리
                </a>
                <a
                  href="/admin/tag-images"
                  style={{
                    padding: "0.5rem 1rem",
                    color: "#6b7280",
                    textDecoration: "none",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  data-oid="251u7o9"
                >
                  사진 관리
                </a>
                <a
                  href="/admin/tag-videos"
                  style={{
                    padding: "0.5rem 1rem",
                    color: "#6b7280",
                    textDecoration: "none",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  data-oid="zh478e2"
                >
                  동영상 관리
                </a>
              </nav>{" "}
            </div>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              data-oid="q8p7-kk"
            >
              <a
                href="/"
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                }}
                data-oid="a61z31e"
              >
                ← Back to Site
              </a>
              <button
                onClick={handleLogout}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#dc2626";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#ef4444";
                }}
                data-oid="02s5o15"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main data-oid="y7xo3dd">{children}</main>
      </div>
    </AdminAuth>
  );
}
