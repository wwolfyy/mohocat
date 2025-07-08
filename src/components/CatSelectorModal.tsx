"use client";

import React, { useState, useEffect } from "react";
import { getCatService } from "@/services";
import { Cat } from "@/types";

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
  title = "고양이 선택"
}) => {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());

  // Load cats when component mounts (not just when modal opens)
  useEffect(() => {
    loadCats();
  }, []);

  // Update selected cats when modal opens and cats are available
  useEffect(() => {
    if (isOpen && cats.length > 0) {
      // Parse existing tags to pre-select cats
      const existingTagNames = selectedTags.filter(tag => tag.trim());
      const selectedCatIds = new Set<string>();

      // Add "이름 없음" if it exists in selected tags
      if (existingTagNames.includes("이름 없음")) {
        selectedCatIds.add("unnamed");
      }

      // Find cat IDs for existing tag names
      cats.forEach(cat => {
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
      console.log("CatSelectorModal: Loading cats...");
      const catService = getCatService();
      const catsData = await catService.getAllCats();
      console.log("CatSelectorModal: Loaded cats:", catsData.length, catsData);
      setCats(catsData);
    } catch (error) {
      console.error("CatSelectorModal: Error loading cats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter cats based on search query
  const filteredCats = cats.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.alt_name && cat.alt_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  console.log("CatSelectorModal: cats.length:", cats.length, "filteredCats.length:", filteredCats.length, "searchQuery:", searchQuery);

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
    if (selectedCats.has("unnamed")) {
      selectedCatNames.push("이름 없음");
    }

    // Add other cat names
    Array.from(selectedCats).forEach(catId => {
      if (catId !== "unnamed") {
        const cat = cats.find(c => c.id === catId);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {/* Search input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="고양이 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>

        {/* Cat list */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              고양이 목록을 불러오는 중...
            </div>
          ) : cats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              등록된 고양이가 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-4">
              {/* "이름 없음" option first */}
              <label
                className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                  selectedCats.has("unnamed")
                    ? "bg-blue-50 border border-blue-200"
                    : "border border-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCats.has("unnamed")}
                  onChange={() => handleCatToggle("unnamed", "이름 없음")}
                  className="mr-2"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">이름 없음</div>
                </div>
              </label>

              {/* Regular cats */}
              {filteredCats.length === 0 && searchQuery ? (
                <div className="col-span-2 p-4 text-center text-gray-500">
                  검색 결과가 없습니다
                </div>
              ) : (
                filteredCats.map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                      selectedCats.has(cat.id)
                        ? "bg-blue-50 border border-blue-200"
                        : "border border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCats.has(cat.id)}
                      onChange={() => handleCatToggle(cat.id, cat.name)}
                      className="mr-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{cat.name}</div>
                      {cat.alt_name && (
                        <div className="text-xs text-gray-500">
                          ({cat.alt_name})
                        </div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 text-sm"
          >
            모두 해제
          </button>
          <button
            onClick={handleDone}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            완료 ({selectedCats.size}개 선택)
          </button>
        </div>
      </div>
    </div>
  );
};

export default CatSelectorModal;
