"use client";

import { useState } from "react";
import { cn } from "@/utils/cn";
import RoleManagement from "@/components/admin/RoleManagement";
import PermissionDebug from "@/components/admin/PermissionDebug";
import RolePermissionConfig from "@/components/admin/RolePermissionConfig";
import ResourcePermissionConfig from "@/components/admin/ResourcePermissionConfig"; // Added import

const MemberManagementPage = () => {
    const [activeTab, setActiveTab] = useState<"users" | "roles" | "permissions" | "contacts" | "debug">("users");

    return (
        <div className="p-4">
            <h1 className="text-center text-2xl font-bold mb-6">
                Member Management
            </h1>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab("users")}
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
                        activeTab === "users"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                >
                    User Management
                </button>
                <button
                    onClick={() => setActiveTab("roles")}
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
                        activeTab === "roles"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                >
                    Role Management
                </button>
                <button
                    onClick={() => setActiveTab("permissions")} // Changed to permissions
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
                        activeTab === "permissions" // Changed to permissions
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                >
                    Permission Management {/* Updated text */}
                </button>
                <button
                    onClick={() => setActiveTab("debug")}
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
                        activeTab === "debug"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                >
                    Permission Debug
                </button>

                <button
                    disabled
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors cursor-not-allowed opacity-50",
                        "border-transparent text-gray-400"
                    )}
                    title="연락처관리 기능은 아직 구현되지 않았습니다."
                >
                    Contact Management
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "users" && <RoleManagement />}

            {activeTab === "roles" && <RolePermissionConfig />}

            {activeTab === "permissions" && <ResourcePermissionConfig />}

            {activeTab === "debug" && (
                <div
                    style={{
                        backgroundColor: "white",
                        padding: "1.5rem",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                >
                    <h3
                        style={{
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            color: "#111827",
                            marginBottom: "1rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                        }}
                    >
                        🔧 Permission Debug Tool
                    </h3>
                    <PermissionDebug />
                </div>
            )}
        </div>
    );
};

export default MemberManagementPage;
