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

  // Helper function to determine if a path is active
  const isActivePath = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  // Helper function to get nav item styles
  const getNavItemStyles = (path: string, isDisabled = false) => ({
    padding: "0.5rem 1rem",
    color: isDisabled ? "#9ca3af" : (isActivePath(path) ? "#111827" : "#6b7280"),
    backgroundColor: isActivePath(path) ? "#f3f4f6" : "transparent",
    textDecoration: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s",
    fontWeight: isActivePath(path) ? "500" : "normal",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.6 : 1,
  });

  // Handle click on disabled items
  const handleDisabledClick = (e: React.MouseEvent, feature: string) => {
    e.preventDefault();
    alert(`${feature} 기능은 아직 구현되지 않았습니다.`);
  };

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
              <nav style={{ display: "flex", gap: "1rem" }} data-oid="viu778z">
                <a
                  href="/admin"
                  style={getNavItemStyles("/admin")}
                  data-oid="l1y0wkd"
                >
                  대쉬보드
                </a>
                <a
                  href="/admin/about-content"
                  style={getNavItemStyles("/admin/about-content")}
                  data-oid="about_mgmt"
                >
                  소개페이지 관리
                </a>
                <a
                  href="/admin/cats"
                  style={getNavItemStyles("/admin/cats")}
                  data-oid="cat_mgmt"
                >
                  고양이 관리
                </a>
                <span
                  style={getNavItemStyles("/admin/points", true)}
                  onClick={(e) => handleDisabledClick(e, "급식소 관리")}
                  data-oid="points_mgmt"
                >
                  급식소 관리
                </span>
                <span
                  style={getNavItemStyles("/admin/winter-houses", true)}
                  onClick={(e) => handleDisabledClick(e, "겨울집 관리")}
                  data-oid="winter_houses_mgmt"
                >
                  겨울집 관리
                </span>
                <a
                  href="/admin/tag-images"
                  style={getNavItemStyles("/admin/tag-images")}
                  data-oid="251u7o9"
                >
                  사진 관리
                </a>
                <a
                  href="/admin/tag-videos"
                  style={getNavItemStyles("/admin/tag-videos")}
                  data-oid="zh478e2"
                >
                  동영상 관리
                </a>
                <a
                  href="/admin/posts"
                  style={getNavItemStyles("/admin/posts")}
                  data-oid="post_mgmt"
                >
                  게시물 관리
                </a>
                <span
                  style={getNavItemStyles("/admin/members", true)}
                  onClick={(e) => handleDisabledClick(e, "회원 관리")}
                  data-oid="members_mgmt"
                >
                  회원 관리
                </span>
              </nav>{" "}
            </div>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              data-oid="q8p7-kk"
            >
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
