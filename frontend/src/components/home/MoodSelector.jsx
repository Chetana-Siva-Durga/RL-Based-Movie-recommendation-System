import React from 'react';
import { motion } from 'framer-motion';

const moods = [
  { value: 'Happy', emoji: '😄', color: 'from-amber-400 to-yellow-300', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'Sad', emoji: '😢', color: 'from-blue-400 to-blue-300', bg: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'Thrilling', emoji: '🔥', color: 'from-orange-500 to-red-400', bg: 'bg-orange-50', border: 'border-orange-200' },
  { value: 'Romantic', emoji: '💕', color: 'from-pink-400 to-rose-300', bg: 'bg-pink-50', border: 'border-pink-200' },
  { value: 'Inspiring', emoji: '✨', color: 'from-emerald-400 to-teal-300', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'Intense', emoji: '💥', color: 'from-red-500 to-rose-400', bg: 'bg-red-50', border: 'border-red-200' },
  { value: 'Fun', emoji: '🎉', color: 'from-violet-400 to-purple-300', bg: 'bg-violet-50', border: 'border-violet-200' },
  { value: 'Emotional', emoji: '🥺', color: 'from-cyan-400 to-sky-300', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { value: 'Adventurous', emoji: '🚀', color: 'from-lime-400 to-green-300', bg: 'bg-lime-50', border: 'border-lime-200' },
  { value: 'Dark', emoji: '🌑', color: 'from-gray-600 to-slate-500', bg: 'bg-gray-50', border: 'border-gray-300' },
];

export default function MoodSelector({ selectedMood, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {moods.map((mood, i) => {
        const isSelected = selectedMood === mood.value;
        return (
          <motion.button
            key={mood.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            onClick={() => onSelect(mood.value)}
            className={`
              relative group flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer
              ${isSelected
                ? `${mood.bg} ${mood.border} shadow-lg scale-[1.02]`
                : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
              }
            `}
          >
            <span className="text-2xl">{mood.emoji}</span>
            <span className={`text-xs font-semibold tracking-wide uppercase ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}>
              {mood.value}
            </span>
            {isSelected && (
              <motion.div
                layoutId="mood-indicator"
                className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r ${mood.color}`}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}