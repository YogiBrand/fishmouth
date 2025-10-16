import React, { useMemo } from 'react';
import { BadgeCheck, Trophy, Zap, Lock, Award, ChevronRight, CheckCircle as Check } from 'lucide-react';

const DashboardQuestPanel = ({ sections = [], tasks = [], totalPoints = 0, onAction, isDark = false }) => {
  const normalizedSections = useMemo(() => {
    if (sections && sections.length) {
      return sections;
    }
    return [
      {
        id: 'default',
        title: 'Command Quests',
        description: '',
        tasks: tasks || [],
      },
    ];
  }, [sections, tasks]);

  const aggregate = useMemo(() => {
    return normalizedSections.reduce(
      (acc, section) => {
        const availableTasks = (section.tasks || []).filter((task) => !task.locked);
        acc.total += availableTasks.length;
        acc.completed += availableTasks.filter((task) => task.completed).length;
        return acc;
      },
      { total: 0, completed: 0 }
    );
  }, [normalizedSections]);

  const overallProgress = aggregate.total ? Math.round((aggregate.completed / aggregate.total) * 100) : 0;
  const container = isDark
    ? 'bg-slate-900/80 border border-slate-800 text-slate-100'
    : 'bg-white border border-gray-200 text-gray-900';

  return (
    <div className={`rounded-3xl p-0 shadow-xl overflow-hidden ${container}`}>
      {/* Header banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15">
              <Trophy size={18} className="text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide/loose opacity-90">Mission Tracker</p>
              <h3 className="text-xl font-semibold mt-0.5">
                {aggregate.completed}/{aggregate.total} complete
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 min-w-[160px]">
              <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300 transition-all"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-[11px] mt-1 opacity-90">{overallProgress}% of active missions cleared</p>
            </div>
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur inline-flex items-center gap-1">
              <Award size={14} /> {totalPoints.toLocaleString()} pts
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
      {normalizedSections.map((section) => {
        const sectionTasks = section.tasks || [];
        const availableTasks = sectionTasks.filter((task) => !task.locked);
        const sectionCompleted = availableTasks.filter((task) => task.completed).length;
        const sectionProgress = availableTasks.length
          ? Math.round((sectionCompleted / availableTasks.length) * 100)
          : 0;
        return (
          <div key={section.id} className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold rounded-full ${
                  isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  <Zap className={isDark ? 'text-blue-300' : 'text-blue-500'} size={14} />
                  {section.title}
                </span>
              </div>
              {availableTasks.length > 0 && (
                <div className="w-full sm:w-48">
                  <div className={`h-2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-200'} overflow-hidden`}>
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 transition-all"
                      style={{ width: `${sectionProgress}%` }}
                    />
                  </div>
                  <p className={`text-[11px] mt-1 text-right ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{sectionProgress}% complete</p>
                </div>
              )}
            </div>

            {section.description && (
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{section.description}</p>
            )}

            <div className={`grid grid-cols-1 ${section.id.includes('locked') ? 'md:grid-cols-2' : 'md:grid-cols-2'} gap-3`}>
              {sectionTasks.length === 0 && (
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>No missions available. New drops coming soon.</div>
              )}
              {sectionTasks.map((task) => {
                const baseCard = isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white';
                const stateCard = task.completed
                  ? isDark
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : 'border-emerald-200 bg-emerald-50'
                  : task.locked
                  ? isDark
                    ? 'opacity-60'
                    : 'opacity-70'
                  : '';
                const leftAccent = task.completed
                  ? 'border-l-4 border-emerald-500'
                  : task.locked
                  ? 'border-l-4 border-slate-400'
                  : 'border-l-4 border-blue-500';
                const disabled = task.completed || task.locked;
                return (
                  <div key={task.id} className={`relative rounded-2xl border px-4 py-3 transition ${baseCard} ${stateCard} ${leftAccent} hover:shadow-md`}> 
                    {/* status chip */}
                    {(task.completed || task.locked) && (
                      <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        task.completed
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {task.completed ? 'Completed' : 'Locked'}
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          {task.completed && <BadgeCheck className="w-4 h-4" />}
                          {task.locked && !task.completed && <Lock className="w-4 h-4" />}
                          <span className="truncate">{task.title}</span>
                        </p>
                        {task.description && (
                          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{task.description}</p>
                        )}
                        {!task.completed && !task.locked && task.requiresEvent && (
                          <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Complete the action to claim this reward.</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-semibold inline-flex items-center gap-1 ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                          <Zap className="w-3 h-3" /> +{task.points || 0} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => onAction?.(task)}
                          disabled={disabled}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                            disabled
                              ? isDark
                                ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-500'
                          }`}
                        >
                          {task.completed ? 'Completed' : task.locked ? 'Locked' : task.actionLabel || 'Open'}
                          {!disabled && <ChevronRight className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};

export default DashboardQuestPanel;
