import React, { createContext, useContext, useCallback, useMemo, useRef, useState } from 'react';
import { sendAssistantMessage, streamAssistantMessage } from '../../services/aiResponseService';
import { getFallbackResponse } from '../../services/fallbackResponses';

const HelpAssistantContext = createContext(null);

export function HelpAssistantProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [contextBlob, setContextBlob] = useState(null);
  const pendingRef = useRef(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const seedGreeting = useCallback(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'sys-greeting',
          role: 'assistant',
          content: "Hi, I'm Fish Mouth Assistant. What do you need help with?",
          ts: Date.now(),
        },
      ];
    });
  }, []);

  const ensureContext = useCallback(async () => {
    if (contextBlob) return contextBlob;
    try {
      const res = await fetch('/api/assistant/context');
      if (res.ok) {
        const data = await res.json();
        setContextBlob(data);
        return data;
      }
    } catch (_) {
      // ignore
    }
    return {};
  }, [contextBlob]);

  const send = useCallback(
    async (text, quickActionKey) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;

      const userMsg = { id: `u-${Date.now()}`, role: 'user', content: trimmed, ts: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const ctx = await ensureContext();
      pendingRef.current = { userMsg, ctx };

      try {
        const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
        // Try streaming first
        let acc = '';
        const abort = new AbortController();
        try {
          await streamAssistantMessage({
            message: trimmed,
            history,
            quickAction: quickActionKey,
            context: ctx,
            signal: abort.signal,
            onChunk: (chunk) => {
              acc += chunk;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'assistant' && last.id.startsWith('a-stream-')) {
                  const updated = prev.slice();
                  updated[updated.length - 1] = { ...last, content: acc };
                  return updated;
                }
                return [...prev, { id: 'a-stream-' + Date.now(), role: 'assistant', content: acc, ts: Date.now() }];
              });
            },
          });
          setMessages((prev) => {
            const updated = prev.slice();
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant' && last.id.startsWith('a-stream-')) {
              updated[updated.length - 1] = { ...last, id: 'a-' + Date.now() };
            }
            return updated;
          });
        } catch (_) {
          // Fallback to non-stream
          const resp = await sendAssistantMessage({ message: trimmed, history, quickAction: quickActionKey, context: ctx });
          const content = String(resp?.content || '').trim() || getFallbackResponse(trimmed);
          setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content, ts: Date.now() }]);
        }
      } catch (_) {
        const content = getFallbackResponse(trimmed);
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content, ts: Date.now(), handoff: false },
        ]);
      } finally {
        setIsLoading(false);
        pendingRef.current = null;
      }
    },
    [messages, ensureContext]
  );

  const value = useMemo(
    () => ({ isOpen, open, close, messages, isLoading, send, seedGreeting }),
    [isOpen, open, close, messages, isLoading, send, seedGreeting]
  );

  return <HelpAssistantContext.Provider value={value}>{children}</HelpAssistantContext.Provider>;
}

export function useHelpAssistant() {
  const ctx = useContext(HelpAssistantContext);
  if (!ctx) {
    throw new Error('useHelpAssistant must be used within HelpAssistantProvider');
  }
  return ctx;
}


