import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Wrench, 
  Bot, 
  RefreshCw,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { AgentActivityItem, AgentWorkflowTask } from "../types/agentWorkflow";
import { AgentOrchestrator } from "../lib/agentOrchestrator";

interface AgentActivityPanelProps {
  onSelectTask?: (taskId: string) => void;
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
}

export default function AgentActivityPanel({ onSelectTask }: AgentActivityPanelProps) {
  const [activities, setActivities] = useState<AgentActivityItem[]>([]);
  const [tasks, setTasks] = useState<AgentWorkflowTask[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const refreshData = () => {
    setActivities(AgentOrchestrator.getRecentActivities());
    setTasks(AgentOrchestrator.getAllTasks());
  };

  useEffect(() => {
    refreshData();
    const unsubActivity = AgentOrchestrator.subscribeActivity(() => {
      refreshData();
    });
    const unsubTasks = AgentOrchestrator.subscribeTasks(() => {
      refreshData();
    });
    return () => {
      unsubActivity();
      unsubTasks();
    };
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "active") return t.status === "RUNNING" || t.status === "PLANNING" || t.status === "WAITING_FOR_APPROVAL";
    if (filter === "completed") return t.status === "COMPLETED";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Active Tasks Grid */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-purple/10 border border-brand-purple/30 flex items-center justify-center text-brand-purple">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Agent Workflows & Tasks</h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                filter === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                filter === "active" ? "bg-brand-purple text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Active ({tasks.filter((t) => t.status === "RUNNING" || t.status === "PLANNING" || t.status === "WAITING_FOR_APPROVAL").length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                filter === "completed" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Completed ({tasks.filter((t) => t.status === "COMPLETED").length})
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-400">
            No agent workflows found in this view. Launch a new autonomous workflow in Agent Studio.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTask && onSelectTask(t.id)}
                className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-brand-purple/50 transition cursor-pointer space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block mb-0.5">
                      {t.network === "base-mainnet" ? "Base Mainnet" : "Base Sepolia"} • {new Date(t.createdAt).toLocaleTimeString()}
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-brand-purple transition line-clamp-1">
                      {t.title}
                    </h4>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      t.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : t.status === "WAITING_FOR_APPROVAL"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                        : t.status === "FAILED"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-brand-purple/20 text-brand-purple border border-brand-purple/30 animate-pulse"
                    }`}
                  >
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Progress</span>
                    <span>{t.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-purple to-emerald-400"
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-900">
                  <span>Agent: <strong className="text-zinc-300">{t.responsibleAgent}</strong></span>
                  <span className="flex items-center gap-1 text-brand-purple font-medium group-hover:translate-x-0.5 transition">
                    View Details <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real-time Tool Activity Feed */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Real-Time Tool Activity</h3>
              <p className="text-xs text-zinc-400">Live feed of autonomous tool calls, security scans, and RPC queries</p>
            </div>
          </div>

          <button
            onClick={refreshData}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title="Refresh Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-4 text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    act.status === "success"
                      ? "bg-emerald-400"
                      : act.status === "running"
                      ? "bg-brand-purple animate-ping"
                      : "bg-rose-400"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{act.agent}</span>
                    <span className="text-zinc-400">used</span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-brand-purple font-semibold">
                      {act.toolName}
                    </span>
                    <span className="text-zinc-300 truncate max-w-[200px]">{act.action}</span>
                  </div>
                  {act.details && (
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-lg">{act.details}</p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0 text-[10px] text-zinc-400">
                {act.durationMs !== undefined && <span className="block">{act.durationMs}ms</span>}
                <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
