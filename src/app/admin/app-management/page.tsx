'use client';

import { useState, useEffect, Suspense } from 'react';
import { cn } from '@/utils/cn';
import AboutContentEditor from '@/components/admin/AboutContentEditor';
import Button from '@/components/admin/ui/Button';
import Card from '@/components/admin/ui/Card';
import { useSearchParams } from 'next/navigation';

function AppManagementContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'about' | 'faq' | 'posts-config'>('about');
  const [isInitialized, setIsInitialized] = useState(false);

  // Posts collections configuration
  const [postsCollectionNames, setPostsCollectionNames] = useState<string>('');
  const [configLoading, setConfigLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Load posts collection configuration from localStorage
  const loadPostsCollectionConfig = () => {
    try {
      const saved = localStorage.getItem('admin-posts-collections');
      if (saved) {
        setPostsCollectionNames(saved);
        return saved.split('\n').filter((name) => name.trim().length > 0);
      }
    } catch (error) {
      console.warn('Failed to load posts collection config from localStorage:', error);
    }

    // Default collections if nothing saved
    const defaultCollections = ['posts_main', 'posts_feeding', 'posts_announcements'];
    setPostsCollectionNames(defaultCollections.join('\n'));
    return defaultCollections;
  };

  // Save posts collection configuration to localStorage
  const savePostsCollectionConfig = (configText: string) => {
    try {
      localStorage.setItem('admin-posts-collections', configText);
      setPostsCollectionNames(configText);
      return true;
    } catch (error) {
      console.error('Failed to save posts collection config to localStorage:', error);
      return false;
    }
  };

  // Check for tab parameter in URL on mount
  useEffect(() => {
    if (!isInitialized) {
      const tab = searchParams.get('tab');
      if (tab && (tab === 'about' || tab === 'faq' || tab === 'posts-config')) {
        setActiveTab(tab as typeof activeTab);
      }
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load posts config when posts-config tab is active
  useEffect(() => {
    if (activeTab === 'posts-config' && isInitialized) {
      loadPostsCollectionConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isInitialized]);

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
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          소개페이지 관리
        </button>
        <button
          onClick={() => setActiveTab('posts-config')}
          className={cn(
            'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
            activeTab === 'posts-config'
              ? 'border-yellow-500 text-yellow-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          게시물 Collections 설정
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

      {activeTab === 'posts-config' && (
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            📝 게시물 컬렉션 설정
          </h3>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            어떤 Firestore 컬렉션을 "게시물" 컬렉션으로 볼지 지정해요. 한 줄에 하나씩 컬렉션 이름을
            입력하면, 대시보드가 각 컬렉션의 문서 수를 보여줘요.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 text-xs text-gray-700">
            <strong>예시:</strong>
            <br />
            <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">
              posts_main
              <br />
              posts_feeding
              <br />
              posts_announcements
              <br />
              posts_events
            </code>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              컬렉션 이름 (한 줄에 하나씩):
            </label>
            <textarea
              value={postsCollectionNames}
              onChange={(e) => setPostsCollectionNames(e.target.value)}
              placeholder="posts_main&#10;posts_feeding&#10;posts_announcements"
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md text-sm font-mono resize-y focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-500/10"
            />
          </div>

          <div className="flex gap-3 items-center">
            <Button
              size="sm"
              className={cn(configSuccess && 'bg-green-600 hover:bg-green-600')}
              onClick={async () => {
                setConfigLoading(true);
                setConfigSuccess(false);
                try {
                  const saved = savePostsCollectionConfig(postsCollectionNames);
                  if (!saved) {
                    throw new Error('설정을 저장하지 못했어요');
                  }

                  const collectionNames = postsCollectionNames
                    .split('\n')
                    .map((name) => name.trim())
                    .filter((name) => name.length > 0);

                  if (collectionNames.length === 0) {
                    throw new Error('컬렉션 이름을 하나 이상 입력해 주세요');
                  }

                  setConfigSuccess(true);
                  setTimeout(() => {
                    setConfigSuccess(false);
                    alert('설정을 저장했어요! 대시보드는 다음에 불러올 때 반영돼요.');
                  }, 500);
                } catch (error) {
                  console.error('Failed to update posts collections config:', error);
                  alert(`오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
                } finally {
                  setConfigLoading(false);
                }
              }}
              disabled={configLoading}
            >
              {configLoading ? '저장 중...' : configSuccess ? '✓ 저장됐어요!' : '설정 저장'}
            </Button>

            <Button variant="secondary" size="sm" onClick={() => loadPostsCollectionConfig()}>
              저장된 값으로 되돌리기
            </Button>

            <div className="text-xs text-gray-500 ml-auto">설정은 브라우저에 저장돼요</div>
          </div>
        </Card>
      )}
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
