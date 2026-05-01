import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, ThumbsUp, ThumbsDown, BarChart2 } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#818cf8', '#4f46e5', '#4338ca'];

export default function RLDashboard({ movies, feedbackHistory }) {
  const history = Array.isArray(feedbackHistory) ? feedbackHistory : [];
  // Top movies by reward
  const topMovies = [...movies]
    .filter(m => m.recommend_count > 0)
    .sort((a, b) => (b.reward_score / (b.recommend_count || 1)) - (a.reward_score / (a.recommend_count || 1)))
    .slice(0, 8)
    .map(m => ({
      name: m.title.length > 15 ? m.title.slice(0, 15) + '…' : m.title,
      score: Number(((m.reward_score || 0) / (m.recommend_count || 1)).toFixed(2)),
      count: m.recommend_count || 0
    }));

  // Genre distribution
  const genreCounts = {};
  movies.forEach(m => { genreCounts[m.genre] = (genreCounts[m.genre] || 0) + 1; });
  const genreData = Object.entries(genreCounts).map(([name, value]) => ({ name, value }));

  // Feedback distribution
  const likes = history.filter(f => f.feedback === 'like').length;
  const dislikes = history.filter(f => f.feedback === 'dislike').length;

  // Cumulative reward over time
  const cumulativeReward = [];
  let cumSum = 0;
  history.forEach((f, i) => {
    cumSum += f.reward;
    cumulativeReward.push({ step: i + 1, reward: cumSum });
  });

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100">
                <Brain className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Movies</p>
                <p className="text-2xl font-bold text-gray-900">{movies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <ThumbsUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Likes</p>
                <p className="text-2xl font-bold text-gray-900">{likes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100">
                <ThumbsDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Dislikes</p>
                <p className="text-2xl font-bold text-gray-900">{dislikes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Cumulative Reward</p>
                <p className="text-2xl font-bold text-gray-900">{cumSum}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Movies by Reward */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" /> Top Movies by Average Reward
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMovies.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topMovies} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" domain={[-1, 1]} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
                No feedback data yet. Start rating movies!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Genre Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Genre Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={genreData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {genreData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cumulative Reward Over Time */}
        {cumulativeReward.length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Agent Learning Curve (Cumulative Reward)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={cumulativeReward}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="step" label={{ value: 'Interaction', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                  <YAxis label={{ value: 'Cumulative Reward', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="reward" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}