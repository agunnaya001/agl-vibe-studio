import { useState, useEffect } from "react";
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
  PinOff
} from "lucide-react";

interface TaskSummaryWidgetProps {
  onNavigateToTasks: () => void;
}

export default function TaskSummaryWidget({ onNavigateToTasks }: TaskSummaryWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    const allTasks = AgunnayaDatabase.getTasks();
    const pendingTasks = allTasks
      .filter(t => t.status !== "completed")
      .sort((a, b) => {
        // Sort by priority (high > medium > low) then by due date
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.dueDate - b.dueDate;
      })
      .slice(0, 3);
    
    setTasks(pendingTasks);
  }, []);

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-24 right-8 z-50 w-72 glass-panel border border-brand-purple/20 bg-zinc-900/90 rounded-2xl shadow-2xl shadow-purple-500/10 p-4 select-none ${
        isPinned ? "border-brand-purple shadow-brand-purple/20" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="cursor-grab active:cursor-grabbing p-1 text-zinc-600 hover:text-zinc-400">
            <GripVertical className="w-4 h-4" />
          </div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 font-display">TaskSync Preview</h3>
        </div>
        <button 
          onClick={() => setIsPinned(!isPinned)}
          className={`p-1.5 rounded-lg transition-colors ${
            isPinned ? "text-brand-purple bg-brand-purple/10" : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            <p className="text-[10px] text-zinc-500">All synchronized tasks cleared!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="flex items-start gap-3 p-2.5 bg-black/40 border border-white/5 rounded-xl hover:border-brand-purple/30 transition-all">
              <div className={`mt-0.5 ${task.priority === "high" ? "text-red-400" : task.priority === "medium" ? "text-amber-400" : "text-blue-400"}`}>
                <Circle className="w-3 h-3 fill-current opacity-20" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold text-white truncate">{task.title}</span>
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
        className="w-full mt-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 transition-all group"
      >
        View Full Synchronizer
        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
}
