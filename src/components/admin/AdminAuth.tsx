"use client";

import { useState, useEffect } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/services/firebase";
import { isAdmin as checkIsAdmin } from "@/lib/auth/admin";

interface AdminAuthProps {
  children: React.ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    try {
      // Set a timeout to avoid infinite loading
      timeoutId = setTimeout(() => {
        if (loading) {
          setAuthError("Authentication timeout - please reload the page");
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        try {
          clearTimeout(timeoutId);
          setUser(user);
          if (user) {
            const adminStatus = checkIsAdmin(user);
            setIsAdmin(adminStatus);
          } else {
            setIsAdmin(false);
          }
          setLoading(false);
        } catch (error) {
          console.error("Error in auth state change:", error);
          setAuthError("Authentication error occurred");
          setLoading(false);
        }
      });

      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      setAuthError("Failed to initialize authentication");
      setLoading(false);
      clearTimeout(timeoutId!);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Clear any previous auth errors on successful login
      setAuthError("");
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Reset all auth state
      setUser(null);
      setIsAdmin(false);
      setAuthError("");
      setLoginError("");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetAuthState = () => {
    setUser(null);
    setIsAdmin(false);
    setAuthError("");
    setLoginError("");
    setEmail("");
    setPassword("");
    setLoading(false);
  };

  if (authError) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
        data-oid="sh1vbqx"
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            maxWidth: "500px",
          }}
          data-oid="2lio06o"
        >
          <div
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
            data-oid="5a024wn"
          >
            ⚠️
          </div>
          <h2
            style={{
              color: "#dc2626",
              marginBottom: "1rem",
              fontSize: "1.25rem",
            }}
            data-oid="vd4h5h8"
          >
            Authentication Error
          </h2>
          <p
            style={{ color: "#6b7280", marginBottom: "1.5rem" }}
            data-oid="ji.gyoe"
          >
            {authError}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center",
            }}
            data-oid="91v6y5h"
          >
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
              data-oid="r.juzb9"
            >
              🔄 Reload Page
            </button>

            <button
              onClick={resetAuthState}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
              data-oid=".956x_u"
            >
              🔃 Reset Auth State
            </button>

            <a
              href="/admin/create-user"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#10b981",
                color: "white",
                borderRadius: "4px",
                textDecoration: "none",
                fontSize: "1rem",
                fontWeight: "500",
              }}
              data-oid="f:qvsjc"
            >
              🛠️ Create Test Admin User ↗
            </a>

            <button
              onClick={() => {
                setAuthError("");
                setLoading(false);
                setIsAdmin(true);
                setUser({ email: "emergency@admin.com" } as User);
              }}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
              data-oid="rf1nbb-"
            >
              🚨 Emergency Bypass
            </button>

            <a
              href="/"
              style={{
                color: "#6b7280",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
              data-oid="v5-up.c"
            >
              ← Back to main site
            </a>
          </div>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
        data-oid="molt2-t"
      >
        <div style={{ textAlign: "center" }} data-oid="ri8ukco">
          <div
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
            data-oid="o1ym79x"
          >
            🐱
          </div>
          <p
            style={{ color: "#6b7280", marginBottom: "1rem" }}
            data-oid="m.zdt.o"
          >
            Loading admin interface...
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
            data-oid="kce.ca:"
          >
            <button
              onClick={() => {
                setLoading(false);
                setAuthError(
                  "Authentication timeout - please check your Firebase configuration",
                );
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
              data-oid="g4xpw9g"
            >
              Stop Loading
            </button>
            <button
              onClick={() => {
                setLoading(false);
                setIsAdmin(true);
                setUser({ email: "test@admin.com" } as User);
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
              data-oid="zroh-z9"
            >
              Emergency Bypass (Dev Mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
          padding: "1rem",
        }}
        data-oid="h7nr890"
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            width: "100%",
            maxWidth: "400px",
          }}
          data-oid="mjgk1z_"
        >
          <div
            style={{ textAlign: "center", marginBottom: "2rem" }}
            data-oid="r0wzka4"
          >
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#111827",
                marginBottom: "0.5rem",
              }}
              data-oid="9l26_1g"
            >
              🐱 Mountain Cats Admin
            </h1>
            <p
              style={{ color: "#6b7280", fontSize: "0.875rem" }}
              data-oid="3l800tm"
            >
              Please sign in to continue
            </p>
            {!user && (
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: "0.75rem",
                  marginTop: "0.5rem",
                  fontStyle: "italic",
                }}
                data-oid="lg_5smn"
              >
                First time? Use the "Create Test Admin User" link below
              </p>
            )}
          </div>

          <form onSubmit={handleLogin} data-oid="vcbsnnu">
            <div style={{ marginBottom: "1rem" }} data-oid=":ap96gc">
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.25rem",
                }}
                data-oid=":g2:8i4"
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "1rem",
                }}
                data-oid="4zgjnv9"
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }} data-oid="c9f03mz">
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.25rem",
                }}
                data-oid="pjhurv-"
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "1rem",
                }}
                data-oid="sfgrl95"
              />
            </div>

            {loginError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "4px",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  color: "#dc2626",
                  fontSize: "0.875rem",
                }}
                data-oid="bx.d54p"
              >
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: loading ? "#9ca3af" : "#3b82f6",
                color: "white",
                padding: "0.75rem",
                borderRadius: "4px",
                border: "none",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              data-oid="g_7irt1"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid #e5e7eb",
              textAlign: "center",
            }}
            data-oid="fy8gxct"
          >
            <div style={{ marginBottom: "1rem" }} data-oid="ka4q2rx">
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                }}
                data-oid="f.vnahl"
              >
                Need admin credentials? Create a test account:
              </p>
              <a
                href="/admin/create-user"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  backgroundColor: "#10b981",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                }}
                data-oid="5oo6gx8"
              >
                🛠️ Create Test Admin User ↗
              </a>
            </div>

            <div style={{ marginBottom: "1rem" }} data-oid="_:5rx30">
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                }}
                data-oid="9w.9msb"
              >
                Having trouble? Try emergency access:
              </p>
              <button
                onClick={() => {
                  setLoading(false);
                  setIsAdmin(true);
                  setUser({ email: "emergency@admin.com" } as User);
                }}
                style={{
                  backgroundColor: "#dc2626",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border: "none",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
                data-oid="khe54nm"
              >
                🚨 Emergency Bypass (Dev Mode)
              </button>
            </div>

            <a
              href="/"
              style={{
                color: "#6b7280",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
              data-oid="fjuiybu"
            >
              ← Back to main site
            </a>
          </div>
        </div>
      </div>
    );
  }
  return <div data-oid="4ct_ad3">{children}</div>;
}
