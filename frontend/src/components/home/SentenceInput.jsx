import React from 'react';
import { Textarea } from '@/components/ui/textarea';

export default function SentenceInput({ sentence, onSentenceChange }) {
  return (
    <div className="space-y-3">
      <Textarea
        placeholder='e.g. "I want something funny", "I feel romantic today", "I am stressed", "something dark and scary", "I need motivation"'
        value={sentence}
        onChange={e => onSentenceChange(e.target.value)}
        className="rounded-2xl min-h-[90px] resize-none text-sm"
      />
    </div>
  );
}