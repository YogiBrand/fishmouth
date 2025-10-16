import React from 'react';

export default function ChatMessage({ role, content, handoff }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-bl-sm'
        }`}
      >
        {content}
        {handoff ? (
          <div className="mt-1 text-[11px] opacity-80">Chatting with an agent…</div>
        ) : null}
      </div>
    </div>
  );
}


