"use client";

import React, { useState, useEffect } from "react";
import ButlerTalkClient from "@/components/ButlerTalkClient";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin as checkIsAdmin } from "@/lib/auth/admin";

const ButlerTalkContent = () => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasPermission(false);
        return;
      }
      
      try {
        // Use the same permission checking logic as the admin page
        const isAdmin = await checkIsAdmin(user);
        // For butler talk, we allow both admin and butler roles
        // You can customize this logic based on your permission requirements
        setHasPermission(isAdmin);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasPermission(false);
      }
    };

    checkPermission();
  }, [user]);

  if (hasPermission === null) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">Checking permissions...</p>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">접근 제한</h1>
        <p className="text-gray-600 mb-4">
          이 페이지에 접근하려면 관리자 권한이 필요합니다.
        </p>
        <p className="text-sm text-gray-500">
          Butler Talk 기능은 관리자와 버틀러만 사용할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4" data-oid="z5x374l">
      <h1
        className="text-center text-2xl font-bold mb-4 mx-auto"
        data-oid=".pbn:qr"
      >
        집사톡
      </h1>

      <ButlerTalkClient />
    </div>
  );
};

const ButlerTalk = () => {
  return <ButlerTalkContent />;
};

export default ButlerTalk;
