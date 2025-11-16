/**
 * Chemical search component with autocomplete
 * Searches local database and optionally PubChem API
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader, Database, Cloud, ChevronDown } from 'lucide-react';
import { Chemical, ChemicalSearchProps } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { searchCompoundByName, pubChemToChemical } from '@/services/pubchem';

export default function ChemicalSearch({
  onSelect,
  placeholder = 'Search for a chemical...',
  allowCustom = false,
}: ChemicalSearchProps) {
  const { chemicals, searchChemicals, addChemical, showToast } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Chemical[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSource, setSearchSource] = useState<'local' | 'pubchem' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search local database
  const searchLocal = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setSearchSource('local');

      try {
        const localResults = await searchChemicals(searchQuery);
        setResults(localResults.slice(0, 10)); // Limit to 10 results
      } catch (error) {
        console.error('Local search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchChemicals]
  );

  // Search PubChem (if no local results)
  const searchPubChem = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !allowCustom) return;

      setIsSearching(true);
      setSearchSource('pubchem');

      try {
        const response = await searchCompoundByName(searchQuery);

        if (response.success && response.data) {
          const chemical = pubChemToChemical(response.data, searchQuery);
          setResults([chemical]);
        } else {
          showToast('warning', response.error || 'Chemical not found in PubChem');
          setResults([]);
        }
      } catch (error) {
        console.error('PubChem search failed:', error);
        showToast('error', 'Failed to search PubChem');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [allowCustom, showToast]
  );

  // Handle query change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchLocal(query);
      } else {
        setResults([]);
        setSearchSource(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchLocal]);

  // Handle chemical selection
  const handleSelect = async (chemical: Chemical) => {
    // If chemical is from PubChem, save it to local database
    if (chemical.id.startsWith('pubchem-')) {
      try {
        await addChemical(chemical);
      } catch (error) {
        console.error('Failed to save chemical:', error);
      }
    }

    onSelect(chemical);
    setQuery(chemical.commonName);
    setIsOpen(false);
    setResults([]);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        } else if (results.length === 1) {
          handleSelect(results[0]);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {isSearching ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          className="input-field pl-10 pr-10"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (results.length > 0 || query.trim()) && (
        <div className="chemical-search-results">
          {/* Source indicator */}
          {searchSource && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              {searchSource === 'local' ? (
                <>
                  <Database className="w-4 h-4" />
                  Local Database
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  PubChem Database
                </>
              )}
            </div>
          )}

          {/* Results list */}
          {results.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {results.map((chemical, index) => (
                <div
                  key={chemical.id}
                  className={`chemical-search-item ${
                    index === selectedIndex ? 'bg-primary-100 dark:bg-primary-900/30' : ''
                  }`}
                  onClick={() => handleSelect(chemical)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {chemical.commonName}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {chemical.formula}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-mono font-semibold text-primary-700 dark:text-primary-300">
                        {chemical.molecularWeight.toFixed(2)} g/mol
                      </div>
                      {chemical.category && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {chemical.category}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Searching...
                </div>
              ) : (
                <div>
                  <p className="mb-2">No results found for "{query}"</p>
                  {allowCustom && (
                    <button
                      onClick={() => searchPubChem(query)}
                      className="btn-secondary btn-sm"
                      disabled={isSearching}
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      Search PubChem
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
