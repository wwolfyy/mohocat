"use client";

import { useState } from "react";
import { getAuthService } from "@/services";

export default function CreateAdminUserPage() {
  const [email, setEmail] = useState("admin@mtcat.com");
  const [password, setPassword] = useState("admin123");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestedEmails = [
    "admin@mtcat.com",
    "jp@mtcat.com",
    "admin@geyang-cats.com",
    "test@admin.com",
  ];

  const createTestUser = async () => {
    setLoading(true);
    setMessage("");

    try {
      // Create the user using auth service
      const authService = getAuthService();
      const user = await authService.createUser(email, password);
      setMessage(`✅ Test admin user created successfully!

📧 Email: ${email}
🔑 Password: ${password}

You can now log in to the admin interface using these credentials.`);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setMessage(`⚠️ User already exists! You can log in with:

📧 Email: ${email}
🔑 Password: ${password}`);
      } else {
        setMessage(`❌ Error creating user: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setMessage("");

    try {
      const authService = getAuthService();
      await authService.signIn(email, password);
      setMessage(`✅ Login test successful! Redirecting to admin dashboard...`);

      // Redirect to admin dashboard after a short delay
      setTimeout(() => {
        window.location.href = "/admin";
      }, 2000);
    } catch (error: any) {
      setMessage(`❌ Login test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "600px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
      }}
      data-oid="mqg_zpq"
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        data-oid="l4wbobr"
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "1rem",
            textAlign: "center",
          }}
          data-oid=".m0qpna"
        >
          🛠️ Create Test Admin User
        </h1>

        <p
          style={{
            color: "#6b7280",
            marginBottom: "2rem",
            textAlign: "center",
          }}
          data-oid="_v5vi0k"
        >
          Create a test admin user for development and testing purposes.
        </p>

        <div
          style={{
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "2rem",
          }}
          data-oid="wpruqf-"
        >
          <p
            style={{ color: "#92400e", margin: 0, fontSize: "0.9rem" }}
            data-oid="cfqy-z5"
          >
            ⚠️ <strong data-oid="br51p-h">Development Only:</strong> This
            utility is for development/testing only. In production, admin users
            should be created through proper channels.
          </p>
        </div>

        <div style={{ marginBottom: "1rem" }} data-oid="vggdjy5">
          <label
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.25rem",
            }}
            data-oid="yzvx:ui"
          >
            Admin Email
          </label>
          <select
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "1rem",
              marginBottom: "0.5rem",
              backgroundColor: "white",
            }}
            data-oid="w.d5ast"
          >
            {suggestedEmails.map((suggestedEmail) => (
              <option
                key={suggestedEmail}
                value={suggestedEmail}
                data-oid="-_56xsr"
              >
                {suggestedEmail}
              </option>
            ))}
          </select>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Or enter custom email"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "1rem",
              marginBottom: "0.5rem",
            }}
            data-oid="rr-q64h"
          />

          <p
            style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}
            data-oid="nalazvo"
          >
            Must be one of the allowed admin emails in the config. Choose from
            dropdown or enter custom email.
          </p>
        </div>

        <div style={{ marginBottom: "2rem" }} data-oid="t_5bluz">
          <label
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.25rem",
            }}
            data-oid="39rcb0b"
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "1rem",
              marginBottom: "0.5rem",
            }}
            data-oid="u6hh078"
          />

          <p
            style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}
            data-oid="ol31d1j"
          >
            Choose a secure password (minimum 6 characters)
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
          }}
          data-oid="axyg:ga"
        >
          <button
            onClick={createTestUser}
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: loading ? "#9ca3af" : "#10b981",
              color: "white",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "none",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            data-oid="uf:h439"
          >
            {loading ? "Creating..." : "Create Admin User"}
          </button>

          <button
            onClick={testLogin}
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: loading ? "#9ca3af" : "#3b82f6",
              color: "white",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "none",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            data-oid="40dxl4x"
          >
            {loading ? "Testing..." : "Test Login"}
          </button>
        </div>

        {message && (
          <div
            style={{
              backgroundColor: message.includes("✅")
                ? "#f0fdf4"
                : message.includes("⚠️")
                  ? "#fef3c7"
                  : "#fef2f2",
              border: `1px solid ${
                message.includes("✅")
                  ? "#bbf7d0"
                  : message.includes("⚠️")
                    ? "#f59e0b"
                    : "#fecaca"
              }`,

              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem",
            }}
            data-oid="2gqrqj_"
          >
            <pre
              style={{
                color: message.includes("✅")
                  ? "#166534"
                  : message.includes("⚠️")
                    ? "#92400e"
                    : "#dc2626",
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
              data-oid="j0iql3e"
            >
              {message}
            </pre>
          </div>
        )}

        <div
          style={{
            backgroundColor: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "1.5rem",
            marginTop: "2rem",
          }}
          data-oid="zk39tac"
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              marginBottom: "1rem",
            }}
            data-oid="km9zjay"
          >
            Quick Setup Instructions:
          </h3>
          <ol
            style={{ color: "#6b7280", margin: 0, paddingLeft: "1.5rem" }}
            data-oid="1842ql4"
          >
            <li data-oid="3mt33r-">
              Click "Create Admin User" to create the test account
            </li>
            <li data-oid="veftttx">
              Click "Test Login" to verify the account works
            </li>
            <li data-oid="nsuvrwq">
              Use the same credentials to log in to the admin interface
            </li>
            <li data-oid="elbjxxs">
              Or go directly to{" "}
              <a href="/admin" style={{ color: "#3b82f6" }} data-oid="0nz84kn">
                /admin
              </a>{" "}
              and log in
            </li>
          </ol>
        </div>

        <div
          style={{
            marginTop: "2rem",
            textAlign: "center",
            paddingTop: "1rem",
            borderTop: "1px solid #e5e7eb",
          }}
          data-oid="n2jq-vc"
        >
          <a
            href="/admin"
            style={{
              color: "#6b7280",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
            data-oid="uodqj6v"
          >
            ← Go to Admin Login
          </a>
        </div>
      </div>
    </div>
  );
}
