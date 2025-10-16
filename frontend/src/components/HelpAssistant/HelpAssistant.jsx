import React, { useEffect, useRef, useState } from 'react';
import { X, Send, LifeBuoy } from 'lucide-react';
import { useHelpAssistant } from './HelpAssistantContext';
import TypingIndicator from './TypingIndicator';
import ChatMessage from './ChatMessage';
import QuickActions from './QuickActions';

export default function HelpAssistant() {
  const { isOpen, close, messages, isLoading, send, seedGreeting } = useHelpAssistant();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      seedGreeting();
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setInput('');
    }
  }, [isOpen, seedGreeting]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const submit = (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text) return;
    send(text);
    setInput('');
  };

  return (
    <div aria-hidden={!isOpen} className={`fixed inset-0 z-[9999] ${isOpen ? '' : 'pointer-events-none'} `}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'} ${
          'bg-black/40'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Help Assistant"
        className={`absolute right-0 top-0 h-full w-full max-w-[26rem] transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          'bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-xl'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><LifeBuoy className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">Assistant</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">How can we help?</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-slate-800 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          <QuickActions onSelect={(key, text) => send(text, key)} />
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} handoff={m.handoff} />
          ))}
          {isLoading && <TypingIndicator />}
        </div>

        {/* Composer */}
        <form onSubmit={submit} className="border-t border-gray-200 dark:border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 h-11 px-3 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

