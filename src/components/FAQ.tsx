import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

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
      {items.map((item, index) => {
        const isOpen = openItems.has(index);
        return (
          <div
            key={index}
            className={cn(
              'overflow-hidden rounded-lg border bg-white transition-colors',
              isOpen ? 'border-brand-200' : 'border-gray-200'
            )}
          >
            <button
              className={cn(
                'w-full px-6 py-4 text-left transition-colors',
                isOpen ? 'bg-brand-50' : 'hover:bg-gray-50'
              )}
              onClick={() => toggleItem(index)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className={cn('text-lg font-medium', isOpen ? 'text-ink' : 'text-gray-900')}>
                  {item.question}
                </h3>
                {isOpen ? (
                  <ChevronUpIcon className="h-5 w-5 flex-shrink-0 text-brand-600" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                )}
              </div>
            </button>
            {isOpen && (
              <div className="px-6 pb-4 pt-1 text-gray-700 leading-relaxed">{item.answer}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FAQAccordion;
