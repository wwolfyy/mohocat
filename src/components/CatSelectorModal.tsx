'use client';

import React, { useState, useEffect } from 'react';
import { getCatService } from '@/services';
import { Cat } from '@/types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { cn } from '@/utils/cn';

interface CatSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  title?: string;
}

const CatSelectorModal: React.FC<CatSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedTags,
  onTagsChange,
  title = '고양이 선택',
}) => {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());

  // Load cats when component mounts (not just when modal opens)
  useEffect(() => {
    loadCats();
  }, []);

  // Update selected cats when modal opens and cats are available
  useEffect(() => {
    if (isOpen && cats.length > 0) {
      // Parse existing tags to pre-select cats
      const existingTagNames = selectedTags.filter((tag) => tag.trim());
      const selectedCatIds = new Set<string>();

      // Add "이름 없음" if it exists in selected tags
      if (existingTagNames.includes('이름 없음')) {
        selectedCatIds.add('unnamed');
      }

      // Find cat IDs for existing tag names
      cats.forEach((cat) => {
        if (existingTagNames.includes(cat.name)) {
          selectedCatIds.add(cat.id);
        }
      });

      setSelectedCats(selectedCatIds);
    }
  }, [isOpen, selectedTags, cats]);

  const loadCats = async () => {
    try {
      setLoading(true);
      console.log('CatSelectorModal: Loading cats...');
      const catService = getCatService();
      const catsData = await catService.getAllCats();
      console.log('CatSelectorModal: Loaded cats:', catsData.length, catsData);
      setCats(catsData);
    } catch (error) {
      console.error('CatSelectorModal: Error loading cats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter cats based on search query
  const filteredCats = cats.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.alt_name && cat.alt_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  console.log(
    'CatSelectorModal: cats.length:',
    cats.length,
    'filteredCats.length:',
    filteredCats.length,
    'searchQuery:',
    searchQuery
  );

  const handleCatToggle = (catId: string, catName: string) => {
    const newSelectedCats = new Set(selectedCats);
    if (newSelectedCats.has(catId)) {
      newSelectedCats.delete(catId);
    } else {
      newSelectedCats.add(catId);
    }
    setSelectedCats(newSelectedCats);
  };

  const handleDone = () => {
    // Convert selected cat IDs to names
    const selectedCatNames: string[] = [];

    // Add "이름 없음" if selected
    if (selectedCats.has('unnamed')) {
      selectedCatNames.push('이름 없음');
    }

    // Add other cat names
    Array.from(selectedCats).forEach((catId) => {
      if (catId !== 'unnamed') {
        const cat = cats.find((c) => c.id === catId);
        if (cat) {
          selectedCatNames.push(cat.name);
        }
      }
    });

    onTagsChange(selectedCatNames);
    onClose();
  };

  const handleClearAll = () => {
    setSelectedCats(new Set());
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="flex flex-col">
        {/* Search input */}
        <input
          type="text"
          placeholder="고양이 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />

        {/* Cat list */}
        <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-4 text-center text-gray-500">고양이 목록을 불러오는 중...</div>
          ) : cats.length === 0 ? (
            <div className="p-4 text-center text-gray-400">등록된 고양이가 없습니다</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-4">
              {/* "이름 없음" option first */}
              <label
                className={cn(
                  'flex cursor-pointer items-center rounded-lg border p-2 transition-colors hover:bg-gray-50',
                  selectedCats.has('unnamed') ? 'border-brand-300 bg-brand-50' : 'border-gray-200'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedCats.has('unnamed')}
                  onChange={() => handleCatToggle('unnamed', '이름 없음')}
                  className="mr-2 accent-brand-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">이름 없음</div>
                </div>
              </label>

              {/* Regular cats */}
              {filteredCats.length === 0 && searchQuery ? (
                <div className="col-span-2 p-4 text-center text-gray-400">검색 결과가 없습니다</div>
              ) : (
                filteredCats.map((cat) => (
                  <label
                    key={cat.id}
                    className={cn(
                      'flex cursor-pointer items-center rounded-lg border p-2 transition-colors hover:bg-gray-50',
                      selectedCats.has(cat.id) ? 'border-brand-300 bg-brand-50' : 'border-gray-200'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCats.has(cat.id)}
                      onChange={() => handleCatToggle(cat.id, cat.name)}
                      className="mr-2 accent-brand-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{cat.name}</div>
                      {cat.alt_name && (
                        <div className="text-xs text-gray-500">({cat.alt_name})</div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={handleClearAll}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
          >
            모두 해제
          </button>
          <Button size="sm" onClick={handleDone}>
            완료 ({selectedCats.size}개 선택)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CatSelectorModal;
