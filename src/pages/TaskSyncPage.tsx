import React, { useState, useEffect } from "react";
import { AgunnayaDatabase } from "../lib/db";
import { Task, WalletState } from "../types";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2,
  Calendar,
  Filter,
  MoreVertical,
  Check
} from "lucide-react";

interface TaskSyncPageProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function TaskSyncPage({ wallet, showToast }: TaskSyncPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "in-progress">("all");

  const loadTasksFromDb = () => {
    setTasks(AgunnayaDatabase.getTasks());
  };

  useEffect(() => {
    loadTasksFromDb();
    window.addEventListener("task_updated", loadTasksFromDb);
    return () => window.removeEventListener("task_updated", loadTasksFromDb);
  }, []);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = AgunnayaDatabase.addTask({
      title: newTaskTitle,
      description: newTaskDesc,
      status: "pending",
      priority: newTaskPriority,
      dueDate: Date.now() + 86400000 * 3, // Default 3 days
    });

    setTasks([newTask, ...tasks]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setIsAddingTask(false);
    window.dispatchEvent(new Event("task_updated"));
    showToast("Task added to synchronizer.", "success");
  };

  const handleToggleStatus = (taskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus: Task["status"] = t.status === "completed" ? "pending" : "completed";
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTasks(updatedTasks);
    AgunnayaDatabase.saveTasks(updatedTasks);
    window.dispatchEvent(new Event("task_updated"));
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    AgunnayaDatabase.saveTasks(updatedTasks);
    window.dispatchEvent(new Event("task_updated"));
    showToast("Task removed.", "info");
  };

  const filteredTasks = tasks.filter(t => filter === "all" || t.status === filter);

  if (!wallet.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Clock className="w-16 h-16 text-zinc-700" />
        <h2 className="text-xl font-bold font-display text-white">TaskSync Synchronizer</h2>
        <p className="text-zinc-500 max-w-sm text-sm">Connect your wallet to synchronize and manage your on-chain developer tasks across the Base ecosystem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">TaskSync</h1>
          <p className="text-xs text-zinc-500 mt-1">Autonomous task management for Web3 developers on Base.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-900 border border-white/5 rounded-xl p-1">
            {(["all", "pending", "in-progress", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  filter === f 
                    ? "bg-brand-purple text-white" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsAddingTask(true)}
            className="px-4 py-2 bg-brand-purple hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {isAddingTask && (
        <div className="glass-panel p-6 rounded-2xl border border-brand-purple/20 bg-brand-purple/5 space-y-4 animate-in slide-in-from-top duration-300">
          <h3 className="text-sm font-bold text-white">Create New Task</h3>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Task Title</label>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Audit base-vault.sol"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-brand-purple outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-brand-purple outline-none transition-all appearance-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500">Description</label>
              <textarea
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder="Details about the task..."
                rows={2}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-brand-purple outline-none transition-all resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-brand-purple text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-purple/20"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
            <Filter className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">No tasks found in this category.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className={`glass-panel p-5 rounded-2xl border transition-all flex items-start gap-4 group ${
                task.status === "completed" 
                  ? "bg-zinc-900/20 border-emerald-500/10 opacity-70" 
                  : "bg-zinc-900/40 border-white/5 hover:border-brand-purple/30"
              }`}
            >
              <button
                onClick={() => handleToggleStatus(task.id)}
                className={`mt-1 shrink-0 transition-colors ${
                  task.status === "completed" ? "text-emerald-500" : "text-zinc-600 hover:text-brand-purple"
                }`}
              >
                {task.status === "completed" ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${task.status === "completed" ? "text-zinc-500 line-through" : "text-white"}`}>
                    {task.title}
                  </h3>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter ${
                    task.priority === "high" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    task.priority === "medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <p className={`text-xs ${task.status === "completed" ? "text-zinc-600" : "text-zinc-400"}`}>
                  {task.description}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                    <Calendar className="w-3 h-3" />
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                  {task.status !== "completed" && (
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                      <Clock className="w-3 h-3" />
                      Status: {task.status}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
