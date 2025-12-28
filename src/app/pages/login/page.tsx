"use client";

import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import LoginForm from "@/components/LoginForm";

const LoginContent = () => {
  const router = useRouter();

  useEffect(() => {
    const handleLoginSuccess = () => {
      const redirectUrl = new URLSearchParams(window.location.search).get(
        "redirect",
      );
      router.push(redirectUrl || "/");
    };

    // Assuming LoginForm emits a custom event on successful login
    window.addEventListener("loginSuccess", handleLoginSuccess);

    return () => {
      window.removeEventListener("loginSuccess", handleLoginSuccess);
    };
  }, [router]);

  return (
    <div
      className="flex items-center justify-center h-screen"
      data-oid="0m4l1dh"
    >
      <div
        className="w-full max-w-md p-4 bg-white rounded shadow-md"
        data-oid="p5o6d1h"
      >
        <h1 className="text-2xl font-bold mb-4" data-oid="7a4_aol">
          Login
        </h1>
        <LoginForm data-oid="1_qv9ef" />
      </div>
    </div>
  );
};

const LoginPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage;
