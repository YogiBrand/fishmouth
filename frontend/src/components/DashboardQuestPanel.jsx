import React, { useMemo } from 'react';
import { BadgeCheck, Trophy, Zap, Lock } from 'lucide-react';

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
    <div className={`rounded-3xl p-6 shadow-xl space-y-6 ${container}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold flex items-center gap-2">
            <Trophy className={isDark ? 'text-amber-300' : 'text-amber-500'} size={16} />
            Mission Tracker
          </p>
          <h3 className="text-xl font-semibold mt-1">
            {aggregate.completed}/{aggregate.total} complete · {totalPoints.toLocaleString()} pts
          </h3>
        </div>
        <div className="w-full sm:w-48">
          <div className={`h-2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-200'} overflow-hidden`}>
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {overallProgress}% of active missions cleared
          </p>
        </div>
      </div>

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
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold flex items-center gap-2">
                  <Zap className={isDark ? 'text-blue-300' : 'text-blue-500'} size={15} />
                  {section.title}
                </p>
                {section.description && (
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{section.description}</p>
                )}
              </div>
              {availableTasks.length > 0 && (
                <div className="w-full sm:w-40">
                  <div className={`h-2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-200'} overflow-hidden`}>
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 transition-all"
                      style={{ width: `${sectionProgress}%` }}
                    />
                  </div>
                  <p className={`text-[11px] mt-1 text-right ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {sectionProgress}% complete
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {sectionTasks.length === 0 && (
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                  No missions available. New drops coming soon.
                </div>
              )}
              {sectionTasks.map((task) => {
                const completedClasses = task.completed
                  ? isDark
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : isDark
                  ? 'border-slate-800 bg-slate-900/60'
                  : 'border-gray-200 bg-white';
                const disabled = task.completed || task.locked;
                return (
                  <div
                    key={task.id}
                    className={`flex flex-col md:flex-row md:items-center gap-3 rounded-2xl border px-4 py-3 transition ${completedClasses} ${
                      task.locked ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {task.completed && <BadgeCheck className="w-4 h-4" />}
                        {task.locked && !task.completed && <Lock className="w-4 h-4" />}
                        {task.title}
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {task.description}
                      </p>
                      {!task.completed && !task.locked && task.requiresEvent && (
                        <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                          Complete the action to claim this reward.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold inline-flex items-center gap-1 ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                        <Zap className="w-3 h-3" />
                        +{task.points || 0} pts
                      </span>
                      <button
                        type="button"
                        onClick={() => onAction?.(task)}
                        disabled={disabled}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                          disabled
                            ? isDark
                              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                      >
                        {task.completed ? 'Completed' : task.locked ? 'Locked' : task.actionLabel || 'Open'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardQuestPanel;
