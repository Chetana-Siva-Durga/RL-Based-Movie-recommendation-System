import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import RLDashboard from '../components/analytics/RLDashboard';
import AlgorithmComparison from '../components/analytics/AlgorithmComparison';
import { motion } from 'framer-motion';
import { api } from '../api/api';

export default function Analytics() {
  const { data: moviesData, isLoading: moviesLoading } = useQuery({
    queryKey: ['movies-analytics'],
    queryFn: () => api.movies.listAll(),
    staleTime: 60_000,
  });
  const movies = Array.isArray(moviesData?.items) ? moviesData.items : [];

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: api.feedback.list,
  });

  const isLoading = moviesLoading || feedbackLoading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">RL Agent Analytics</h1>
          <p className="text-gray-500 mt-2 text-base">Monitor how the recommendation agent learns and adapts over time.</p>
        </motion.div>
        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <>
              <RLDashboard movies={movies} feedbackHistory={feedback} />
              <AlgorithmComparison feedbackHistory={feedback} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
