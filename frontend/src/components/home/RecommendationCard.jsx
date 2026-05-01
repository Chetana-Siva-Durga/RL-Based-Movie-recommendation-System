import React from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Star, Film, User, Calendar, Zap, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const moodColors = {
  Happy: 'bg-amber-100 text-amber-800',
  Sad: 'bg-blue-100 text-blue-800',
  Thrilling: 'bg-orange-100 text-orange-800',
  Romantic: 'bg-pink-100 text-pink-800',
  Inspiring: 'bg-emerald-100 text-emerald-800',
  Intense: 'bg-red-100 text-red-800',
  Fun: 'bg-violet-100 text-violet-800',
  Emotional: 'bg-cyan-100 text-cyan-800',
  Adventurous: 'bg-lime-100 text-lime-800',
  Dark: 'bg-gray-200 text-gray-800',
};

export default function RecommendationCard({ movie, explanation, isExploration, epsilon, meta, onFeedback, feedbackGiven, isSubmittingFeedback }) {
  if (!movie) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-2xl shadow-gray-200/40"
    >
      {/* RL Agent Badge */}
      <div className="absolute top-4 right-4 z-10">
        {meta ? (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 border px-3 py-1 text-xs font-semibold shadow-sm text-center flex items-center justify-center">
            <Sparkles className="w-3 h-3 mr-1 inline" /> Thompson Sampling
          </Badge>
        ) : (
          <Badge className={`${isExploration ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'} border px-3 py-1 text-xs font-semibold shadow-sm text-center flex items-center justify-center`}>
            {isExploration ? (
              <><Sparkles className="w-3 h-3 mr-1 inline" /> Exploring</>
            ) : (
              <><Zap className="w-3 h-3 mr-1 inline" /> Exploiting</>
            )}
          </Badge>
        )}
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Poster Area */}
        <div className="md:w-80 h-64 md:h-auto relative overflow-hidden">
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white text-sm font-bold">{movie.imdb_rating}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 flex flex-col">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{movie.title}</h2>
            
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-medium">{movie.genre}</Badge>
              <Badge className={`${moodColors[movie.primary_mood]} font-medium`}>{movie.primary_mood}</Badge>
              {movie.secondary_mood && (
                <Badge className={`${moodColors[movie.secondary_mood]} font-medium`}>{movie.secondary_mood}</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Film className="w-4 h-4" />{movie.director}</span>
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{movie.lead_actor}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{movie.year}</span>
            </div>

            <p className="mt-4 text-gray-600 leading-relaxed">{movie.description}</p>

            {/* Explanation Box */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Why this recommendation?</p>
                  <p className="text-sm text-indigo-800 leading-relaxed">{explanation}</p>
                </div>
              </div>
            </div>

            {/* RL Stats */}
            <div className="mt-4 flex items-center gap-4 text-[11px] font-mono text-gray-400">
              {meta ? (
                <>
                  <span>α = {meta.alpha}</span>
                  <span>β = {meta.beta}</span>
                  <span>θ = {meta.theta?.toFixed(4)}</span>
                </>
              ) : (
                <span>ε = {epsilon?.toFixed(3)}</span>
              )}
              <span>Recommended {movie.recommend_count || 0}×</span>
            </div>
          </div>

          {/* Feedback */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            {feedbackGiven ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-gray-500"
              >
                <span className="text-lg">{feedbackGiven === 'like' ? '👍' : '👎'}</span>
                <span>Thanks for your feedback! The RL agent is learning from this.</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 mr-2">Rate this recommendation:</span>
                <Button
                  onClick={() => onFeedback('like')}
                  disabled={isSubmittingFeedback}
                  variant="outline"
                  className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 gap-2"
                >
                  {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  Like
                </Button>
                <Button
                  onClick={() => onFeedback('dislike')}
                  disabled={isSubmittingFeedback}
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2"
                >
                  {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                  Dislike
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}