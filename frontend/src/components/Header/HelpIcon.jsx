import React from 'react';
import { LifeBuoy } from 'lucide-react';
import { useHelpAssistant } from '../HelpAssistant/HelpAssistantContext';

export default function HelpIcon() {
  const { open } = useHelpAssistant();
  return (
    <button
      type="button"
      onClick={open}
      className="relative flex items-center gap-2 px-4 h-11 rounded-2xl transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
      aria-label="Open help assistant"
      aria-haspopup="dialog"
    >
      <LifeBuoy className="w-5 h-5" />
    </button>
  );
}


