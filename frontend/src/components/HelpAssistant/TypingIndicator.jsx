import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
      <span className="inline-flex h-2 w-2 rounded-full bg-gray-400/70 animate-bounce [animation-delay:-0.3s]" />
      <span className="inline-flex h-2 w-2 rounded-full bg-gray-400/70 animate-bounce [animation-delay:-0.15s]" />
      <span className="inline-flex h-2 w-2 rounded-full bg-gray-400/70 animate-bounce" />
    </div>
  );
}


