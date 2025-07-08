"use client";

import React, { useState } from "react";
import { cn } from "@/utils/cn";
import ButlerStreamClient from "./ButlerStreamClient";
import ButlerTalkClient from "./ButlerTalkClient";

const ButlerStreamTabs = () => {
  const [activeTab, setActiveTab] = useState<'feeding' | 'talk'>('feeding');

  return (
    <div className="mt-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('feeding')}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'feeding'
                ? "border-orange-400 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            급식현황
          </button>
          <button
            onClick={() => setActiveTab('talk')}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'talk'
                ? "border-orange-400 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            집사톡
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'feeding' && <ButlerStreamClient />}
        {activeTab === 'talk' && <ButlerTalkClient />}
      </div>
    </div>
  );
};

export default ButlerStreamTabs;
