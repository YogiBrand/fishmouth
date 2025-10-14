import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Sparkles, X, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const ManualReviewModal = ({ review, onClose, onResolve, isDark = false }) => {
  const [subject, setSubject] = useState(() => review?.subject || '');
  const [content, setContent] = useState(() => review?.body || review?.message || review?.script || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const containerClasses = useMemo(
    () =>
      isDark
        ? 'bg-slate-900 text-slate-100 border border-slate-800'
        : 'bg-white text-gray-900 border border-gray-200',
    [isDark]
  );

  const labelClass = isDark ? 'block text-sm font-semibold text-slate-200 mb-1' : 'block text-sm font-semibold text-slate-700 mb-1';
  const inputClass = isDark
    ? 'w-full rounded-lg border border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
    : 'w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const textareaClass = `${inputClass} resize-none`;
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';

  const isEmail = review?.stepType === 'email';
  const isSms = review?.stepType === 'sms';
  const isVoice = review?.stepType === 'voice_call';

  useEffect(() => {
    if (!review) return;
    setSubject(review.subject || '');
    setContent(review.body || review.message || review.script || '');
    setAiPrompt('');
    setNotes('');
    setIsLoading(false);
  }, [review]);

  if (!review) return null;

  const handleRegenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Tell the AI what you would like to change before regenerating.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/sequences/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_type: review.stepType,
          subject,
          content,
          prompt: aiPrompt,
          sequence_id: review.sequenceId,
          step_id: review.stepId,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.subject) setSubject(data.subject);
        if (data.content) setContent(data.content);
        toast.success('Draft regenerated with your instructions.');
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.warn('AI regeneration fallback', error);
    }
    const merged = `${aiPrompt.trim()}

${content}`.trim();
    setContent(merged);
    toast('Generated a revised draft using your guidance.', { icon: '✨' });
    setIsLoading(false);
  };

  const resolveReview = (status) => {
    if (!onResolve) return;
    onResolve({
      status,
      subject,
      body: isEmail ? content : undefined,
      message: isSms ? content : undefined,
      script: isVoice ? content : undefined,
      notes,
    });
  };

  const renderPreviewHeader = () => {
    if (isEmail) {
      return (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <Mail className={isDark ? 'text-blue-300' : 'text-blue-500'} size={15} />
          Email Draft
        </div>
      );
    }
    if (isSms) {
      return (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <Sparkles className={isDark ? 'text-emerald-300' : 'text-emerald-500'} size={15} />
          SMS Draft
        </div>
      );
    }
    if (isVoice) {
      return (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <Phone className={isDark ? 'text-purple-300' : 'text-purple-500'} size={15} />
          Voice Call Script
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm px-4">
      <div className={`w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden ${containerClasses}`}>
        <div className={`flex items-start justify-between gap-4 px-6 py-5 ${isDark ? 'border-b border-slate-800' : 'border-b border-gray-200'}`}>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold">
              <ClipboardCheck className={isDark ? 'text-amber-300' : 'text-amber-500'} size={14} />
              Manual review required
            </div>
            <h3 className="text-2xl font-semibold">{review.stepLabel}</h3>
            <p className={`text-sm ${mutedClass}`}>
              {review.manualSend
                ? 'Automation paused. Approve, edit, or save this draft for manual sending.'
                : 'Review the AI-generated draft before it sends.'}
            </p>
            <div className={`flex flex-wrap gap-3 text-xs ${mutedClass}`}>
              {review.sequenceName && <span className="font-semibold">Sequence: {review.sequenceName}</span>}
              {review.lead?.name && <span>Lead: {review.lead.name}</span>}
              {review.createdAt && <span>Queued {new Date(review.createdAt).toLocaleString()}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg transition ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            aria-label="Close manual review"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <div className={`rounded-2xl px-4 py-3 border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-slate-50'}`}>
            {renderPreviewHeader()}
            {isEmail && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={labelClass}>Subject line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className={inputClass}
                    placeholder="Update the subject before sending"
                  />
                </div>
                <div>
                  <label className={labelClass}>Email body</label>
                  <textarea
                    rows={10}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className={textareaClass}
                    placeholder="Edit the email copy"
                  />
                </div>
              </div>
            )}
            {isSms && (
              <div className="mt-4">
                <label className={labelClass}>SMS message</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className={textareaClass}
                  placeholder="Edit the SMS copy"
                  maxLength={320}
                />
                <p className={`mt-1 text-xs ${mutedClass}`}>{content.length}/320 characters</p>
              </div>
            )}
            {isVoice && (
              <div className="mt-4">
                <label className={labelClass}>Call script</label>
                <textarea
                  rows={10}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className={textareaClass}
                  placeholder="Edit the voice script"
                />
              </div>
            )}
          </div>

          <div className={`rounded-2xl px-4 py-3 border ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
              <Sparkles className={isDark ? 'text-blue-300' : 'text-blue-500'} size={14} />
              Regenerate with AI
            </p>
            <textarea
              rows={4}
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              className={textareaClass}
              placeholder="Tell the AI what you want to include, remove, or change — it will customise it for you."
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRegenerate}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  isDark ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
                disabled={isLoading}
              >
                {isLoading ? 'Regenerating…' : 'Regenerate draft'}
              </button>
              <button
                type="button"
                onClick={() => setAiPrompt('')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  isDark ? 'bg-slate-800/70 text-slate-200 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                disabled={isLoading}
              >
                Clear prompt
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Internal notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={textareaClass}
              placeholder="Add context for your team or future audits (optional)"
            />
          </div>
        </div>

        <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-gray-200 bg-gray-50'} flex flex-wrap items-center justify-between gap-3`}>
          <div className={`text-xs ${mutedClass}`}>
            Changes are logged in the activity feed for compliance. Approving will release the step instantly.
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                resolveReview(review.manualSend ? 'manual' : 'approved');
                onClose?.();
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                isDark ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {review.manualSend ? 'Save manual draft' : 'Approve & send'}
            </button>
            {review.manualSend && (
              <button
                type="button"
                onClick={() => {
                  resolveReview('approved');
                  onClose?.();
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                  isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Approve & release now
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                isDark ? 'bg-slate-800/70 text-slate-200 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualReviewModal;
