import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Sparkles } from 'lucide-react';

const EPS_COLOR = '#6366f1';   // indigo
const THO_COLOR = '#a855f7';   // purple

export default function AlgorithmComparison({ feedbackHistory }) {
  const history = Array.isArray(feedbackHistory) ? feedbackHistory : [];
  const epsFeedback = history.filter(f => !f.algorithm || f.algorithm.includes('epsilon'));
  const thoFeedback = history.filter(f => f.algorithm && f.algorithm.includes('thompson'));

  // ── 1. Summary stats ──────────────────────────────────────
  const stats = (fb) => {
    const likes = fb.filter(f => f.feedback === 'like').length;
    const dislikes = fb.filter(f => f.feedback === 'dislike').length;
    const total = fb.length;
    const cumReward = fb.reduce((s, f) => s + (f.reward || 0), 0);
    const rate = total > 0 ? Math.round((likes / total) * 100) : 0;
    return { likes, dislikes, total, cumReward, rate };
  };
  const epsStats = stats(epsFeedback);
  const thoStats = stats(thoFeedback);

  // ── 2. Head-to-head bar chart ──────────────────────────────
  const headToHead = [
    { metric: 'Likes', epsilon: epsStats.likes, thompson: thoStats.likes },
    { metric: 'Dislikes', epsilon: epsStats.dislikes, thompson: thoStats.dislikes },
    { metric: 'Total', epsilon: epsStats.total, thompson: thoStats.total },
    { metric: 'Cum. Reward', epsilon: epsStats.cumReward, thompson: thoStats.cumReward },
  ];

  // ── 3. Approval rate comparison ────────────────────────────
  const approvalData = [
    { name: 'ε-Greedy', rate: epsStats.rate, fill: EPS_COLOR },
    { name: 'Thompson', rate: thoStats.rate, fill: THO_COLOR },
  ];

  // ── 4. Cumulative reward over time (both algorithms) ───────
  const buildCumLine = (fb) => {
    let cum = 0;
    return fb.map((f, i) => { cum += f.reward || 0; return { step: i + 1, reward: cum }; });
  };

  // Merge both into single dataset for dual-line chart
  const maxLen = Math.max(epsFeedback.length, thoFeedback.length);
  const epsLine = buildCumLine(epsFeedback);
  const thoLine = buildCumLine(thoFeedback);
  const combinedLine = Array.from({ length: maxLen }, (_, i) => ({
    step: i + 1,
    epsilon: epsLine[i]?.reward ?? null,
    thompson: thoLine[i]?.reward ?? null,
  }));

  // ── 5. Mood-level performance ──────────────────────────────
  const moodPerf = {};
  [...epsFeedback, ...thoFeedback].forEach(f => {
    if (!f.mood_context) return;
    if (!moodPerf[f.mood_context]) moodPerf[f.mood_context] = { mood: f.mood_context, epsLikes: 0, epsTotal: 0, thoLikes: 0, thoTotal: 0 };
    if (!f.algorithm || f.algorithm.includes('epsilon')) {
      moodPerf[f.mood_context].epsTotal++;
      if (f.feedback === 'like') moodPerf[f.mood_context].epsLikes++;
    } else {
      moodPerf[f.mood_context].thoTotal++;
      if (f.feedback === 'like') moodPerf[f.mood_context].thoLikes++;
    }
  });
  const moodData = Object.values(moodPerf).map(m => ({
    mood: m.mood,
    'ε-Greedy': m.epsTotal > 0 ? Math.round((m.epsLikes / m.epsTotal) * 100) : 0,
    Thompson: m.thoTotal > 0 ? Math.round((m.thoLikes / m.thoTotal) * 100) : 0,
  }));

  // ── 6. Radar chart data ────────────────────────────────────
  const radarData = [
    { subject: 'Approval %', epsilon: epsStats.rate, thompson: thoStats.rate, fullMark: 100 },
    { subject: 'Volume', epsilon: Math.min(100, epsStats.total * 5), thompson: Math.min(100, thoStats.total * 5), fullMark: 100 },
    { subject: 'Cum Reward', epsilon: Math.max(0, epsStats.cumReward * 10), thompson: Math.max(0, thoStats.cumReward * 10), fullMark: 100 },
    { subject: 'Like Count', epsilon: Math.min(100, epsStats.likes * 5), thompson: Math.min(100, thoStats.likes * 5), fullMark: 100 },
    { subject: 'Efficiency', epsilon: epsStats.total > 0 ? Math.round((epsStats.cumReward / epsStats.total) * 50 + 50) : 50, thompson: thoStats.total > 0 ? Math.round((thoStats.cumReward / thoStats.total) * 50 + 50) : 50, fullMark: 100 },
  ];

  const noData = epsStats.total === 0 && thoStats.total === 0;

  if (noData) {
    return (
      <Card className="border-0 shadow-sm mt-8">
        <CardContent className="h-40 flex items-center justify-center text-sm text-gray-400">
          No algorithm comparison data yet. Rate some movies using both algorithms!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mt-12 bg-white p-8 rounded-3xl shadow-xl w-full border border-gray-100">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Algorithm Comparison</h2>
        <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" /> ε-Greedy
        </span>
        <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> Thompson
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'ε-Greedy Approval', value: `${epsStats.rate}%`, color: EPS_COLOR, sub: `${epsStats.total} ratings` },
          { label: 'Thompson Approval', value: `${thoStats.rate}%`, color: THO_COLOR, sub: `${thoStats.total} ratings` },
          { label: 'ε-Greedy Reward', value: epsStats.cumReward, color: EPS_COLOR, sub: `${epsStats.likes}L / ${epsStats.dislikes}D` },
          { label: 'Thompson Reward', value: thoStats.cumReward, color: THO_COLOR, sub: `${thoStats.likes}L / ${thoStats.dislikes}D` },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} className="border-0 shadow-sm border border-gray-50 rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Head-to-head bar */}
        <Card className="border-0 shadow-sm border border-gray-50 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold text-gray-800">Head-to-Head Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={headToHead} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="epsilon" name="ε-Greedy" fill={EPS_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="thompson" name="Thompson" fill={THO_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Approval rate bar */}
        <Card className="border-0 shadow-sm border border-gray-50 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold text-gray-800">Approval Rate (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={approvalData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={50}>
                  {approvalData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cumulative reward over time — dual line */}
        {combinedLine.length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-2 border border-gray-50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold text-gray-800">Cumulative Reward Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={combinedLine}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="step" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line connectNulls type="monotone" dataKey="epsilon" name="ε-Greedy" stroke={EPS_COLOR} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  <Line connectNulls type="monotone" dataKey="thompson" name="Thompson" stroke={THO_COLOR} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Mood-level approval rate */}
        {moodData.length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-2 border border-gray-50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold text-gray-800">Approval Rate by Mood (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={moodData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="mood" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="ε-Greedy" fill={EPS_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Thompson" fill={THO_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Radar comparison */}
        <Card className="border-0 shadow-sm lg:col-span-2 border border-gray-50 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold text-gray-800">Overall Performance Radar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData} margin={{ top: 20, bottom: 20 }}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
                <Radar name="ε-Greedy" dataKey="epsilon" stroke={EPS_COLOR} fill={EPS_COLOR} fillOpacity={0.4} />
                <Radar name="Thompson" dataKey="thompson" stroke={THO_COLOR} fill={THO_COLOR} fillOpacity={0.4} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
