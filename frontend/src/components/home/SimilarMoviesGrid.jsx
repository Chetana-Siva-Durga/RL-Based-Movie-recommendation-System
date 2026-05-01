import React from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SimilarMoviesGrid({
  movies,
  onFeedback,
  feedbackGiven = {}
}) {
  if (!movies || movies.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Similar Movies You Might Enjoy
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {movies.map((movie, i) => {
          const given = feedbackGiven[movie.id];

          return (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              {/* Poster */}
              <div className="relative h-36 overflow-hidden">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Rating */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-white text-xs font-bold">
                    {movie.imdb_rating}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 flex flex-col flex-1">
                <h4 className="font-semibold text-sm text-gray-900 truncate">
                  {movie.title}
                </h4>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {movie.genre}
                  </Badge>
                  <span className="text-[10px] text-gray-400">
                    {movie.year}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {movie.description}
                </p>

                {/* Feedback Section */}
                {onFeedback && (
                  <div className="mt-3 pt-2 border-t border-gray-50">
                    {given ? (
                      <p className="text-[11px] text-gray-400 text-center">
                        {given === 'like' ? '👍 Liked' : '👎 Disliked'}
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-[11px] rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                          onClick={() => onFeedback(movie, 'like')}
                        >
                          <ThumbsUp className="w-3 h-3" /> Like
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-[11px] rounded-lg border-red-200 text-red-600 hover:bg-red-50 gap-1"
                          onClick={() => onFeedback(movie, 'dislike')}
                        >
                          <ThumbsDown className="w-3 h-3" /> Dislike
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}