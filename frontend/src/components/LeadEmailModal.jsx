import React, { useMemo } from 'react';
import { Calendar, Mail, Reply, Share2, User, X } from 'lucide-react';

const LeadEmailModal = ({
  thread,
  lead,
  onClose,
  isDark = false,
  onReply,
  onForward,
}) => {
  const from = thread?.from || lead?.homeowner_name || lead?.homeowner_email || 'Unknown sender';
  const to = thread?.to || lead?.business_email || 'You';
  const subject = thread?.title || 'Email thread';
  const occurredAt = thread?.occurred_at || thread?.timestamp || new Date().toISOString();
  const body = thread?.description || thread?.body || 'No additional context captured.';
  const metadata = useMemo(() => thread?.metadata || {}, [thread]);

  const container = isDark
    ? 'bg-slate-900 text-slate-100 border border-slate-800'
    : 'bg-white text-gray-900 border border-gray-200';
  const muted = isDark ? 'text-slate-400' : 'text-gray-500';
  const divider = isDark ? 'border-slate-800' : 'border-gray-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden ${container}`}>
        <div className={`px-6 py-4 flex items-start justify-between gap-4 ${divider} border-b`}>
          <div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4" />
              <span className="font-semibold uppercase tracking-wide">Email Thread</span>
            </div>
            <h3 className="text-lg font-semibold mt-1">{subject}</h3>
            <p className={`text-xs ${muted}`}>
              {new Date(occurredAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            aria-label="Close email transcript"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 text-sm leading-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`flex items-center gap-2 ${muted}`}>
              <User className="w-3.5 h-3.5" /> From <span className="font-semibold text-gray-900 dark:text-slate-100">{from}</span>
            </div>
            <div className={`flex items-center gap-2 ${muted}`}>
              <User className="w-3.5 h-3.5" /> To <span className="font-semibold text-gray-900 dark:text-slate-100">{to}</span>
            </div>
            {thread?.cc && (
              <div className={`flex items-center gap-2 ${muted}`}>
                <User className="w-3.5 h-3.5" /> CC <span className="font-semibold text-gray-900 dark:text-slate-100">{thread.cc}</span>
              </div>
            )}
            <div className={`flex items-center gap-2 ${muted}`}>
              <Calendar className="w-3.5 h-3.5" /> Logged <span className="font-semibold text-gray-900 dark:text-slate-100">{new Date(occurredAt).toLocaleString()}</span>
            </div>
          </div>

          <div className={`rounded-2xl border ${divider} px-4 py-3 bg-white/90 dark:bg-slate-900/60 text-sm leading-6`}>
            <div className="whitespace-pre-wrap">{body}</div>
          </div>

          {metadata?.attachments?.length > 0 && (
            <div className="space-y-2 text-xs">
              <p className={`font-semibold uppercase tracking-wide ${muted}`}>Attachments</p>
              <ul className="space-y-1">
                {metadata.attachments.map((file) => (
                  <li key={file.url || file.name} className="flex items-center justify-between gap-2">
                    <span>{file.name}</span>
                    {file.url && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-xs font-semibold ${
                          isDark ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-500'
                        }`}
                      >
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`px-6 py-4 border-t ${divider} flex flex-wrap items-center justify-end gap-2`}>
          <button
            type="button"
            onClick={() => {
              if (typeof onForward === 'function') {
                onForward({ thread, lead });
              }
            }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Forward
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof onReply === 'function') {
                onReply({ thread, lead });
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500"
          >
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadEmailModal;
