import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

interface FAQProps {
  items: FAQItem[];
}

const FAQAccordion: React.FC<FAQProps> = ({ items }) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg">
          <button
            className="w-full px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 hover:bg-gray-50 transition-colors duration-200"
            onClick={() => toggleItem(index)}
            aria-expanded={openItems.has(index)}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 pr-4">
                {item.question}
              </h3>
              {openItems.has(index) ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
              )}
            </div>
          </button>
          {openItems.has(index) && (
            <div className="px-6 pb-4">
              <div className="text-gray-700 leading-relaxed">
                {item.answer}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FAQAccordion;
