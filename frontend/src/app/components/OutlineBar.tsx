'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNotes } from '@/lib/contexts/NotesContext';
import { ChevronRight, ChevronDown, ChevronsRight, ChevronsLeft } from 'lucide-react';
import debounce from 'lodash/debounce';
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'] });

interface OutlineItem {
  id: string;
  level: number;
  title: string;
  children: OutlineItem[];
  element?: HTMLElement;
}

interface OutlineBarProps {
  contentRef: React.RefObject<HTMLElement>;
  className?: string;
  onItemClick?: (item: OutlineItem) => void;
}

const OutlineBar: React.FC<OutlineBarProps> = ({
  contentRef,
  className = '',
  onItemClick
}) => {
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { currentNote, notes } = useNotes();

  // Generate outline from markdown content
  const generateOutline = useCallback((content: string): OutlineItem[] => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const matches = Array.from(content.matchAll(headingRegex));
    const outline: OutlineItem[] = [];
    const stack: OutlineItem[] = [];

    matches.forEach((match, index) => {
      const level = match[1].length;
      const title = match[2].trim();
      const id = `heading-${index}`;

      const item: OutlineItem = {
        id,
        level,
        title,
        children: []
      };

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        outline.push(item);
      } else {
        stack[stack.length - 1].children.push(item);
      }

      stack.push(item);
    });

    return outline;
  }, []);

  // Setup intersection observer
  useEffect(() => {
    const observerCallback = debounce((entries: IntersectionObserverEntry[]) => {
      const visible = entries.find(entry => entry.isIntersecting);
      if (visible?.target.id) {
        setActiveId(visible.target.id);
      }
    }, 100);

    observerRef.current = new IntersectionObserver(observerCallback, {
      rootMargin: '-80px 0px -80% 0px'
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Update outline when note content changes
  useEffect(() => {
    if (currentNote && notes[currentNote]) {
      const content = notes[currentNote].content;
      const newOutline = generateOutline(content);
      setOutline(newOutline);
      setExpandedItems(new Set(newOutline.map(item => item.id)));
    }
  }, [currentNote, notes, generateOutline]);

  // Observe heading elements
  useEffect(() => {
    if (contentRef.current && observerRef.current) {
      const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        if (heading.id && observerRef.current) {
          observerRef.current.observe(heading);
        }
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [contentRef, outline]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleItemClick = (item: OutlineItem) => {
    const element = contentRef.current?.querySelector(`#${item.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onItemClick?.(item);
  };

  const renderOutlineItem = (item: OutlineItem, depth = 0) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = activeId === item.id;

    return (
      <div key={item.id} className="outline-item">
        <div
          className={`
            flex items-center py-1 px-2 rounded-lg cursor-pointer
            hover:bg-gray-100 dark:hover:bg-gray-800
            ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}
            transition-colors
          `}
          style={{ paddingLeft: `${depth * 16}px` }}
          onClick={() => handleItemClick(item)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          <span className={`ml-${hasChildren ? '2' : '6'} text-sm`}>
            {item.title}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="outline-children">
            {item.children.map(child => renderOutlineItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center w-10 ml-6">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Expand outline"
        >
          <ChevronsLeft className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className={`${className} h-[calc(100vh-96px)] ${plusJakartaSans.className} w-64 bg-white rounded-[20px] border border-gray-200 flex flex-col`}>
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Outline</h1>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Collapse outline"
        >
          <ChevronsRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {!currentNote || outline.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 text-gray-500 text-sm">
          No headings found
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          {outline.map(item => renderOutlineItem(item))}
        </div>
      )}
    </div>
  );
};

export default OutlineBar;