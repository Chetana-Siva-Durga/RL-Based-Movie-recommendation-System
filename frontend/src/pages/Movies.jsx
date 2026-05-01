import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Search, Star, Film, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/api';

const PAGE_SIZE = 18;

const GENRES = ['Action', 'Drama', 'Thriller', 'Romance', 'Comedy', 'Crime', 'Fantasy', 'Family'];
const MOODS  = ['Happy', 'Sad', 'Romantic', 'Fun', 'Thrilling', 'Inspiring', 'Intense', 'Emotional', 'Adventurous', 'Dark'];

const moodColors = {
  Happy:       'bg-amber-100 text-amber-800',
  Sad:         'bg-blue-100 text-blue-800',
  Thrilling:   'bg-orange-100 text-orange-800',
  Romantic:    'bg-pink-100 text-pink-800',
  Inspiring:   'bg-emerald-100 text-emerald-800',
  Intense:     'bg-red-100 text-red-800',
  Fun:         'bg-violet-100 text-violet-800',
  Emotional:   'bg-cyan-100 text-cyan-800',
  Adventurous: 'bg-lime-100 text-lime-800',
  Dark:        'bg-gray-200 text-gray-800',
};

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Movies() {
  const [search,      setSearch]      = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [moodFilter,  setMoodFilter]  = useState('all');

  const debouncedSearch = useDebounce(search);
  const sentinelRef = useRef(null);

  // ── Infinite query ──────────────────────────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['movies-paginated', debouncedSearch, genreFilter, moodFilter],
    queryFn: ({ pageParam = 1 }) =>
      api.movies.list({
        page:   pageParam,
        limit:  PAGE_SIZE,
        search: debouncedSearch,
        genre:  genreFilter,
        mood:   moodFilter,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60_000,
  });

  // Flatten pages → movies array
  const movies = data?.pages.flatMap(p => p.items) ?? [];
  const total  = data?.pages[0]?.total ?? 0;

  // ── Intersection Observer for infinite scroll ───────────────────────────────
  const handleObserver = useCallback((entries) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Reset to page 1 whenever filters change (handled by queryKey change)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Movie Database</h1>
          <p className="text-gray-500 mt-2 text-base">
            {isLoading ? 'Loading…' : `${total} Telugu movies in the RL agent's action space`}
          </p>
        </motion.div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search movies…"
              className="pl-10 rounded-xl"
            />
          </div>

          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={moodFilter} onValueChange={setMoodFilter}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Moods</SelectItem>
              {MOODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Live refresh indicator */}
          {isFetching && !isFetchingNextPage && (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {movies.map((movie, i) => (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i % PAGE_SIZE, 8) * 0.04 }}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-white text-xs font-bold">{movie.imdb_rating}</span>
                        </div>
                        <div className="bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                          <span className="text-white text-xs">{movie.year}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-gray-900">{movie.title}</h3>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                        <Film className="w-3.5 h-3.5" />
                        <span>{movie.director}</span>
                        <span className="text-gray-300">·</span>
                        <span>{movie.lead_actor}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <Badge variant="secondary" className="text-[10px]">{movie.genre}</Badge>
                        <Badge className={`${moodColors[movie.primary_mood] ?? 'bg-gray-100 text-gray-700'} text-[10px]`}>
                          {movie.primary_mood}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-3 line-clamp-2">{movie.description}</p>
                      {movie.recommend_count > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center gap-3 text-[10px] text-gray-400">
                          <span>Recommended {movie.recommend_count}×</span>
                          <span>Score: {movie.reward_score}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-16 flex items-center justify-center mt-4">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  Loading more…
                </div>
              )}
              {!hasNextPage && movies.length > 0 && (
                <p className="text-xs text-gray-300">All {total} movies loaded</p>
              )}
            </div>

            {/* Empty state */}
            {!isLoading && movies.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <ChevronDown className="w-8 h-8 mx-auto mb-3 opacity-30" />
                No movies match your filters.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
