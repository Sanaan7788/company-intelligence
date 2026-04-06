import { useState, useEffect } from 'react';
import { TaskEntry } from '../types';

interface Props {
  tasks: Record<string, TaskEntry>;
  runningCount: number;
}

export function TaskTracker({ tasks, runningCount }: Props) {
  const [open, setOpen] = useState(false);
  const [showDoneBadge, setShowDoneBadge] = useState(false);

  const taskList = Object.values(tasks);
  const hasAny = taskList.length > 0;

  // Show "done" badge briefly after all tasks complete
  useEffect(() => {
    if (runningCount === 0 && hasAny) {
      setShowDoneBadge(true);
      const timer = setTimeout(() => setShowDoneBadge(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowDoneBadge(false);
    }
  }, [runningCount, hasAny]);

  // Auto-close panel when nothing left to show
  useEffect(() => {
    if (!hasAny && !showDoneBadge) {
      setOpen(false);
    }
  }, [hasAny, showDoneBadge]);

  const badgeVisible = runningCount > 0 || showDoneBadge;

  if (!badgeVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 print:hidden">
      {/* Expanded panel */}
      {open && (
        <div className="w-72 bg-[#111] border border-gray-700 shadow-2xl">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Background Tasks</span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-600 hover:text-gray-300 text-sm leading-none px-1"
            >
              ✕
            </button>
          </div>

          {/* Task list */}
          <div className="max-h-64 overflow-y-auto">
            {taskList.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-600 text-center">No active tasks</div>
            ) : (
              <ul>
                {taskList.map(task => (
                  <TaskRow key={task.companyId} task={task} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Badge */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-all ${
          runningCount > 0
            ? 'bg-amber-900/20 border-amber-700 text-amber-400 animate-pulse'
            : 'bg-emerald-900/20 border-emerald-800 text-emerald-400'
        }`}
      >
        {runningCount > 0 ? (
          <>
            <span>⚙</span>
            <span>{runningCount} running</span>
          </>
        ) : (
          <>
            <span>✓</span>
            <span>All done</span>
          </>
        )}
      </button>
    </div>
  );
}

function TaskRow({ task }: { task: TaskEntry }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (task.status === 'done' || task.status === 'error') {
      // Start fade at 4s, fully gone at 5s
      const fadeTimer = setTimeout(() => setFading(true), 4000);
      const removeTimer = setTimeout(() => setVisible(false), 5000);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [task.status]);

  if (!visible) return null;

  return (
    <li
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-800/50 last:border-b-0 transition-opacity duration-700 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Status indicator */}
      <span className="flex-shrink-0">
        {task.status === 'running' && (
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
        {task.status === 'done' && (
          <span className="text-emerald-400 text-xs leading-none">✓</span>
        )}
        {task.status === 'error' && (
          <span className="text-red-400 text-xs leading-none">✗</span>
        )}
      </span>

      {/* Company name */}
      <span className="flex-1 min-w-0 text-xs text-gray-200 truncate">{task.companyName}</span>

      {/* Task type / result */}
      <span className="flex-shrink-0 text-xs">
        {task.status === 'running' && (
          <span className="text-gray-500">{task.taskType}</span>
        )}
        {task.status === 'done' && (
          <span className="text-emerald-400">Complete</span>
        )}
        {task.status === 'error' && (
          <span className="text-red-400">Failed</span>
        )}
      </span>
    </li>
  );
}
