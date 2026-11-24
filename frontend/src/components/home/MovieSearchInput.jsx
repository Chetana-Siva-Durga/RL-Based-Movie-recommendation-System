import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function MovieSearchInput({ movies, onSelect, selectedMovie }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef(null);

  const filtered = query.length > 0
    ? movies.filter(m => m.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (movie) => {
    onSelect(movie);
    setQuery(movie.title);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setQuery('');
    onSelect(null);
    setShowDropdown(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setShowDropdown(false);
      return;
    }

    if (event.key !== 'Enter' || !showDropdown || filtered.length === 0) return;

    event.preventDefault();
    const normalizedQuery = query.trim().toLowerCase();
    const exactMatch = filtered.find(
      movie => movie.title.trim().toLowerCase() === normalizedQuery
    );
    handleSelect(exactMatch || filtered[0]);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            if (e.target.value === '') onSelect(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && setShowDropdown(true)}
          placeholder="Search for a Telugu movie..."
          className="pl-12 pr-10 h-14 text-base rounded-2xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
        />
        {query && (
          <button onClick={handleClear} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {filtered.map(movie => (
              <button
                key={movie.id}
                onClick={() => handleSelect(movie)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm">
                  🎬
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{movie.title}</p>
                  <p className="text-xs text-gray-500">{movie.genre} · {movie.year} · {movie.primary_mood}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedMovie && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100"
        >
          <span className="text-sm">🎬</span>
          <span className="text-sm font-medium text-indigo-800">{selectedMovie.title}</span>
          <span className="text-xs text-indigo-500">({selectedMovie.year})</span>
        </motion.div>
      )}
    </div>
  );
}