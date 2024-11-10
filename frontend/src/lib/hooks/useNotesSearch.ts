import { useState, useCallback, useEffect } from 'react';
import debounce from 'lodash/debounce';
import type { TreeItem } from '../types/types';
import { useNotes } from '../contexts/NotesContext';

interface UseNotesSearchResult {
  searchQuery: string;
  searchResults: TreeItem[];
  expandedFolders: Set<string>;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearSearch: () => void;
}

export function useNotesSearch(): UseNotesSearchResult {
  const { searchNotes } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TreeItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      const results = searchNotes(query);
      setSearchResults(results);

      if (query.trim()) {
        const foldersToExpand = new Set(['root']);
        const addParentFolders = (items: TreeItem[]) => {
          items.forEach(item => {
            if (item.type === 'folder') {
              foldersToExpand.add(item.id);
              if (item.children) {
                addParentFolders(item.children);
              }
            }
          });
        };
        addParentFolders(results);
        setExpandedFolders(foldersToExpand);
      }
    }, 300),
    [searchNotes]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setExpandedFolders(new Set(['root']));
  };

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return {
    searchQuery,
    searchResults,
    expandedFolders,
    handleSearch,
    clearSearch,
  };
}