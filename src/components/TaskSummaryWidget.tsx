import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Task } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  GripVertical,
  Pin,
  PinOff,
  Minimize2,
  Maximize2,
  Plus,
  X
} from "lucide-react";

interface TaskSummaryWidgetProps {
  onNavigateToTasks: () => void;
}

export default function TaskSummaryWidget({ onNavigateToTasks }: TaskSummaryWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");

  const loadTasks = () => {
    const allTasks = AgunnayaDatabase.getTasks();
    const pendingTasks = allTasks
      .filter(t => t.status !== "completed")
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.dueDate - b.dueDate;
      })
      .slice(0, 3);
    
    setTasks(pendingTasks);
  };

  useEffect(() => {
    loadTasks();
    window.addEventListener("task_updated", loadTasks);
    return () => window.removeEventListener("task_updated", loadTasks);
  }, []);

  const handleToggleInline = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const allTasks = AgunnayaDatabase.getTasks();
    const updated = allTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: "completed" as const };
      }
      return t;
    });
    AgunnayaDatabase.saveTasks(updated);
    window.dispatchEvent(new Event("task_updated"));
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    AgunnayaDatabase.addTask({
      title: quickTitle.trim(),
      description: "Added via TaskSync Quick Widget",
      status: "pending",
      priority: "high",
      dueDate: Date.now() + 86400000 * 2
    });
    setQuickTitle("");
    setIsQuickAdding(false);
    window.dispatchEvent(new Event("task_updated"));
  };

  if (isMinimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-8 z-50 cursor-pointer bg-zinc-900 border border-brand-purple/40 text-white rounded-full px-4 py-2 shadow-2xl shadow-purple-500/20 flex items-center gap-2 text-xs font-bold font-mono hover:bg-brand-purple/20 transition-all select-none"
      >
        <Clock className="w-4 h-4 text-brand-purple animate-pulse" />
        <span>Tasks ({tasks.length})</span>
        <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
      </motion.div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-24 right-8 z-50 w-72 glass-panel border border-brand-purple/20 bg-zinc-900/95 rounded-2xl shadow-2xl shadow-purple-500/10 p-4 select-none ${
        isPinned ? "border-brand-purple shadow-brand-purple/20" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="cursor-grab active:cursor-grabbing p-1 text-zinc-600 hover:text-zinc-400">
            <GripVertical className="w-4 h-4" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-display">TaskSync Widget</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsQuickAdding(!isQuickAdding)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Quick Add Task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1 rounded-lg transition-colors ${
              isPinned ? "text-brand-purple bg-brand-purple/10" : "text-zinc-600 hover:text-zinc-400"
            }`}
            title={isPinned ? "Unpin Widget" : "Pin Widget"}
          >
            {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isQuickAdding && (
        <form onSubmit={handleQuickAddSubmit} className="mb-3 flex items-center gap-1.5 animate-in fade-in duration-200">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick task title..."
            className="flex-1 bg-black/60 border border-brand-purple/40 rounded-xl px-2.5 py-1 text-[11px] text-white focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-brand-purple text-white text-[10px] font-bold rounded-xl shrink-0"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setIsQuickAdding(false)}
            className="p-1 text-zinc-500 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </form>
      )}

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            <p className="text-[10px] text-zinc-500 font-mono">All pending tasks completed!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="flex items-start gap-2.5 p-2 bg-black/40 border border-white/5 rounded-xl hover:border-brand-purple/30 transition-all group">
              <button
                onClick={(e) => handleToggleInline(e, task.id)}
                className={`mt-0.5 shrink-0 transition-colors ${
                  task.priority === "high" ? "text-red-400 hover:text-emerald-400" :
                  task.priority === "medium" ? "text-amber-400 hover:text-emerald-400" :
                  "text-blue-400 hover:text-emerald-400"
                }`}
                title="Mark completed"
              >
                <Circle className="w-3.5 h-3.5 fill-current opacity-30 hover:opacity-100 transition-opacity" />
              </button>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold text-white truncate group-hover:text-brand-purple/90 transition-colors">{task.title}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[8px] font-bold uppercase ${
                    task.priority === "high" ? "text-red-400" :
                    task.priority === "medium" ? "text-amber-400" :
                    "text-blue-400"
                  }`}>
                    {task.priority}
                  </span>
                  <span className="text-[8px] text-zinc-500 font-mono">
                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={onNavigateToTasks}
        className="w-full mt-3 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all group"
      >
        View TaskSync Workspace
        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
}
