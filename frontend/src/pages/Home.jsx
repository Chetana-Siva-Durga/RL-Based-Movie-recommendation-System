import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Clapperboard, Smile, MessageSquare, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/api';

import MoodSelector from '../components/home/MoodSelector';
import MovieSearchInput from '../components/home/MovieSearchInput';
import SentenceInput from '../components/home/SentenceInput';
import RecommendationCard from '../components/home/RecommendationCard';
import SimilarMoviesGrid from '../components/home/SimilarMoviesGrid';

// computeReward stays client-side (it's just a simple mapping)
import { computeReward } from '../components/rl/RecommendationEngine';

// Mood detection is now handled by the backend NLP engine.

export default function Home() {
  const queryClient = useQueryClient();

  const [inputType, setInputType]         = useState('mood');
  const [selectedMood, setSelectedMood]   = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [sentence, setSentence]           = useState('');
  const [algorithm, setAlgorithm]         = useState('epsilon_greedy');

  const [recommendation, setRecommendation]           = useState(null);
  const [feedbackGiven, setFeedbackGiven]             = useState(null);
  const [similarFeedback, setSimilarFeedback]         = useState({});
  const [isRecommending, setIsRecommending]           = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [sessionCount, setSessionCount]               = useState(0);

  // Only fetch movie list when "movie" tab is active (for autocomplete)
  const { data: moviesData, isLoading: moviesLoading } = useQuery({
    queryKey: ['movies-all'],
    queryFn: () => api.movies.listAll(),
    enabled: inputType === 'movie',
    staleTime: 5 * 60 * 1000,
  });
  const allMovies = moviesData?.items ?? [];

  // ── Recommend ──────────────────────────────────────────────────────────────
  const handleRecommend = async () => {
    const context = { session_count: sessionCount, algorithm };

    if (inputType === 'mood') {
      context.mood = selectedMood;
    } else if (inputType === 'sentence') {
      if (!sentence) return;
      context.user_text = sentence;
    } else if (inputType === 'movie' && selectedMovie) {
      context.reference_movie_id = selectedMovie.id;
      context.mood     = selectedMovie.primary_mood;
      context.genre    = selectedMovie.genre;
      context.keywords = selectedMovie.keywords;
    }

    setIsRecommending(true);
    try {
      const result = await api.recommend.get(context);
      if (!result || result.error) return;

      setRecommendation(result);
      setFeedbackGiven(null);
      setSimilarFeedback({});
      setSessionCount(prev => prev + 1);

    } finally {
      setIsRecommending(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getMoodContext = () => {
    if (inputType === 'mood')     return selectedMood;
    if (inputType === 'sentence') return recommendation?.movie?.primary_mood || 'Sentence';
    return selectedMovie?.primary_mood;
  };

  // ── Feedback ───────────────────────────────────────────────────────────────
  const handleFeedback = async (feedback) => {
    if (!recommendation) return;
    setIsSubmittingFeedback(true);

    const reward = computeReward(feedback);
    const movie  = recommendation.movie;

    await api.feedback.create({
      movie_id:    movie.id,
      movie_title: movie.title,
      feedback,
      reward,
      mood_context: getMoodContext(),
      explanation:  recommendation.explanation,
      algorithm:    algorithm,
    });

    queryClient.invalidateQueries({ queryKey: ['movies'] });
    setFeedbackGiven(feedback);
    setIsSubmittingFeedback(false);
  };

  const handleSimilarFeedback = async (movie, feedback) => {
    if (similarFeedback[movie.id]) return;
    const reward = computeReward(feedback);

    await api.feedback.create({
      movie_id:    movie.id,
      movie_title: movie.title,
      feedback,
      reward,
      mood_context: getMoodContext(),
      explanation:  'Feedback on similar movie',
      algorithm:    algorithm,
    });

    queryClient.invalidateQueries({ queryKey: ['movies'] });
    setSimilarFeedback(prev => ({ ...prev, [movie.id]: feedback }));
  };

  const canRecommend =
    (inputType === 'mood'     && selectedMood)   ||
    (inputType === 'movie'    && selectedMovie)  ||
    (inputType === 'sentence' && sentence.trim().length > 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold">
            🎬 Telugu Movie Recommender
          </h1>
          <p className="text-gray-500 mt-3">
            RL-based recommendations that learn from your feedback
          </p>
        </motion.div>

        {/* Input panel */}
        <div className="bg-white p-6 rounded-3xl shadow-lg mb-8">
          <Tabs value={inputType} onValueChange={(v) => {
            setInputType(v);
            setRecommendation(null);
            setFeedbackGiven(null);
            setSimilarFeedback({});
          }} className="mb-8">
            <TabsList>
              <TabsTrigger value="mood">    <Smile />        Mood</TabsTrigger>
              <TabsTrigger value="movie">   <Clapperboard /> Movie</TabsTrigger>
              <TabsTrigger value="sentence"><MessageSquare />Sentence</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="min-h-[180px]">
            {inputType === 'mood' && (
              <MoodSelector selectedMood={selectedMood} onSelect={setSelectedMood} />
            )}

            {inputType === 'movie' && (
              <MovieSearchInput
                movies={allMovies}
                selectedMovie={selectedMovie}
                onSelect={setSelectedMovie}
              />
            )}

            {inputType === 'sentence' && (
              <SentenceInput
                sentence={sentence}
                onSentenceChange={setSentence}
              />
            )}
          </div>

          <div className="mt-12 text-center border-t border-gray-100 pt-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex bg-gray-100/80 p-1.5 rounded-2xl w-fit shadow-inner">
                <button
                  onClick={() => setAlgorithm('epsilon_greedy')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    algorithm === 'epsilon_greedy'
                      ? 'bg-white shadow-sm text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ⚡ ε-Greedy
                </button>
                <button
                  onClick={() => setAlgorithm('thompson')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    algorithm === 'thompson'
                      ? 'bg-white shadow-sm text-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🎲 Thompson Sampling
                </button>
              </div>
            </div>
            
            <p className="text-[11px] text-gray-400 text-center mb-6 max-w-sm mx-auto leading-relaxed">
              {algorithm === 'epsilon_greedy'
                ? 'ε-Greedy: explores randomly with probability ε, exploits best known movie otherwise'
                : 'Thompson Sampling: dynamically balances exploration and exploitation using Bayesian probability'}
            </p>

            <Button
              size="lg"
              className={`w-full max-w-xs h-12 text-base font-semibold shadow-xl shadow-indigo-200/50 rounded-xl transition-colors ${
                algorithm === 'thompson' 
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200/50' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              onClick={handleRecommend}
              disabled={!canRecommend || isRecommending || (inputType === 'movie' && moviesLoading)}
            >
              {isRecommending ? (
                <><Loader2 className="animate-spin w-5 h-5 mr-2" />Finding You a Movie…</>
              ) : (
                <><Clapperboard className="w-5 h-5 mr-2" />Get Recommendation</>
              )}
            </Button>
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {recommendation && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <RecommendationCard
                movie={recommendation.movie}
                explanation={recommendation.explanation}
                isExploration={recommendation.is_exploration}
                epsilon={recommendation.epsilon}
                meta={recommendation.meta}
                onFeedback={handleFeedback}
                feedbackGiven={feedbackGiven}
                isSubmittingFeedback={isSubmittingFeedback}
              />

              <SimilarMoviesGrid
                movies={recommendation.similar_movies}
                onFeedback={handleSimilarFeedback}
                feedbackGiven={similarFeedback}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}