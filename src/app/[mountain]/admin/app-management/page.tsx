'use client';

import { useState, useEffect, Suspense } from 'react';
import { cn } from '@/utils/cn';
import AboutContentEditor from '@/components/admin/AboutContentEditor';
import { useSearchParams } from 'next/navigation';

/**
 * 앱 관리 — CMS-editable app-level content.
 *
 * 🗑️ The 게시물 컬렉션 설정 tab was **removed 2026-08-02**. It let an admin type a
 * list of Firestore collection names, saved them to `localStorage`, and the
 * dashboard's 게시물 tile listed those names — each with a hard-coded `0`, because
 * the count was never implemented. Nothing else read it, the default list named a
 * `posts_main` collection that has never existed, and being per-browser it could
 * not have been a shared setting anyway. The dashboard now counts the four real
 * post collections directly, which is a fact about the code rather than an
 * operator choice. Do not reintroduce it.
 */

function AppManagementContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'about' | 'faq'>('about');
  const [isInitialized, setIsInitialized] = useState(false);

  // Check for tab parameter in URL on mount
  useEffect(() => {
    if (!isInitialized) {
      const tab = searchParams.get('tab');
      if (tab && tab === 'about') {
        setActiveTab(tab as typeof activeTab);
      }
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-center text-2xl font-bold mb-6">앱 관리</h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('about')}
          className={cn(
            'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
            activeTab === 'about'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          소개페이지 관리
        </button>
        <button
          disabled
          className={cn(
            'px-6 py-3 font-medium text-sm border-b-2 transition-colors cursor-not-allowed opacity-50',
            'border-transparent text-gray-400'
          )}
          title="FAQ 기능은 아직 구현되지 않았습니다."
        >
          FAQ
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'about' && <AboutContentEditor />}
    </div>
  );
}

export default function AppManagementPage() {
  return (
    <Suspense fallback={<div className="p-4">앱 관리를 불러오고 있어요...</div>}>
      <AppManagementContent />
    </Suspense>
  );
}
