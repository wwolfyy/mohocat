"use client";

import { useState } from "react";
import { cn } from "@/utils/cn";
import AboutContentEditor from "@/components/admin/AboutContentEditor";

const AppManagementPage = () => {
    const [activeTab, setActiveTab] = useState<"about" | "faq">("about");

    return (
        <div className="p-4">
            <h1 className="text-center text-2xl font-bold mb-6">
                App Management
            </h1>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab("about")}
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
                        activeTab === "about"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                >
                    소개페이지 관리
                </button>
                <button
                    disabled
                    className={cn(
                        "px-6 py-3 font-medium text-sm border-b-2 transition-colors cursor-not-allowed opacity-50",
                        "border-transparent text-gray-400"
                    )}
                    title="FAQ 기능은 아직 구현되지 않았습니다."
                >
                    FAQ
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "about" && <AboutContentEditor />}
        </div>
    );
};

export default AppManagementPage;
