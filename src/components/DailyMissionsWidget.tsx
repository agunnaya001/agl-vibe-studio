import React, { useState, useEffect } from "react";
import { UserProfile, DailyMission } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { 
  Trophy, 
  Flame, 
  CheckCircle2, 
  Zap, 
  TrendingUp, 
  Code2, 
  ShieldCheck, 
  FileSpreadsheet, 
  CalendarCheck, 
  ArrowRight,
  Gift,
  Coins,
  Sparkles
} from "lucide-react";

interface DailyMissionsWidgetProps {
  userAddress: string;
  onNavigateTab: (tab: string) => void;
  onRewardClaimed?: () => void;
}

export default function DailyMissionsWidget({
  userAddress,
  onNavigateTab,
  onRewardClaimed
}: DailyMissionsWidgetProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadProfile = () => {
    if (!userAddress) return;
    const p = AgunnayaDatabase.getUserProfile(userAddress);
    setProfile(p);
  };

  useEffect(() => {
    reloadProfile();
  }, [userAddress]);

  if (!profile) {
    return null;
  }

  const missions = profile.dailyMissions || [];
  const completedCount = missions.filter(m => m.completed).length;
  const totalMissions = missions.length;
  const progressPct = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;
  
  const totalClaimableCredits = missions
    .filter(m => m.completed && !m.claimed)
    .reduce((sum, m) => sum + m.creditReward, 0);

  const handleClaim = (missionId: string) => {
    if (!userAddress) return;
    try {
      setClaimingId(missionId);
      const res = AgunnayaDatabase.claimMissionReward(userAddress, missionId);
      setProfile(res.updatedProfile);
      setToastMessage(`🎉 Claimed +${res.creditReward} Bonus AGL Credits!`);
      if (onRewardClaimed) onRewardClaimed();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(`Error: ${err.message || "Failed to claim reward"}`);
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setClaimingId(null);
    }
  };

  const handleSimulateAction = (category: "trade" | "deploy" | "stake" | "social" | "checkin" | "form") => {
    if (!userAddress) return;
    AgunnayaDatabase.triggerMissionAction(userAddress, category);
    reloadProfile();
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "CalendarCheck":
        return <CalendarCheck className="w-4 h-4 text-emerald-400" />;
      case "TrendingUp":
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case "Code2":
        return <Code2 className="w-4 h-4 text-purple-400" />;
      case "ShieldCheck":
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case "FileSpreadsheet":
        return <FileSpreadsheet className="w-4 h-4 text-cyan-400" />;
      default:
        return <Zap className="w-4 h-4 text-brand-purple" />;
    }
  };

  const getNavigationTabForCategory = (category: string) => {
    switch (category) {
      case "trade":
        return "trade";
      case "deploy":
        return "ai-builder";
      case "stake":
        return "staking";
      case "form":
        return "google-forms";
      default:
        return "dashboard";
    }
  };

  return (
    <div id="daily-missions-widget-root" className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/30 space-y-6 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-1/4 w-64 h-64 rounded-full bg-brand-purple/5 blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Daily Missions
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" /> {profile.streakDays} Day Streak
            </span>
          </div>
          <h2 className="text-lg font-bold font-display text-white mt-1.5 flex items-center gap-2">
            Earn Bonus AGL Credits Daily
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Complete daily developer actions to claim computational AGL credits stored in your profile.
          </p>
        </div>

        {/* Progress Tracker Box */}
        <div className="flex items-center gap-4 bg-zinc-950 p-3.5 rounded-xl border border-white/10 shrink-0">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono gap-3">
              <span className="text-zinc-400 text-[10px] uppercase font-bold">Daily Progress</span>
              <span className="font-bold text-emerald-400">{completedCount} / {totalMissions} Completed</span>
            </div>
            <div className="w-36 bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-brand-purple h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="text-right border-l border-white/10 pl-3">
            <span className="block text-[9px] uppercase text-zinc-500 font-mono font-bold">Total Earned</span>
            <span className="text-sm font-mono font-bold text-amber-400 flex items-center justify-end gap-1">
              <Coins className="w-3.5 h-3.5" /> {profile.totalCreditsEarned}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification if claiming */}
      {toastMessage && (
        <div className="p-3 bg-brand-purple/20 border border-brand-purple/40 rounded-xl text-xs font-mono text-white flex items-center justify-between animate-fade-in shadow-lg">
          <span className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Missions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {missions.map((mission) => {
          const isCompleted = mission.completed;
          const isClaimed = mission.claimed;
          const navTab = getNavigationTabForCategory(mission.category);

          return (
            <div 
              key={mission.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                isClaimed 
                  ? "bg-zinc-950/40 border-white/5 opacity-75"
                  : isCompleted 
                  ? "bg-brand-purple/10 border-brand-purple/40 shadow-lg shadow-brand-purple/5"
                  : "bg-zinc-950/80 border-white/5 hover:border-white/15"
              }`}
            >
              {/* Card Top */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-zinc-900 border border-white/5">
                      {getCategoryIcon(mission.iconName)}
                    </div>
                    <span className="text-xs font-bold text-white font-display">{mission.title}</span>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    +{mission.creditReward} AGL
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed pl-0.5">
                  {mission.description}
                </p>
              </div>

              {/* Card Bottom Progress & Action Button */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  {isClaimed ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Rewards Claimed
                    </span>
                  ) : isCompleted ? (
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" /> Ready to Claim!
                    </span>
                  ) : (
                    <span className="text-zinc-500">
                      Progress: <strong className="text-white">{mission.currentProgress}</strong> / {mission.targetCount}
                    </span>
                  )}
                </div>

                {/* Button State */}
                <div>
                  {isClaimed ? (
                    <button 
                      disabled 
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-500 text-[10px] font-mono font-bold cursor-not-allowed border border-white/5"
                    >
                      Completed
                    </button>
                  ) : isCompleted ? (
                    <button
                      id={`claim-mission-${mission.id}`}
                      onClick={() => handleClaim(mission.id)}
                      disabled={claimingId === mission.id}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-brand-purple hover:brightness-110 text-white text-[10px] font-mono font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer"
                    >
                      <Gift className="w-3 h-3" />
                      {claimingId === mission.id ? "Claiming..." : "Claim Reward"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        id={`go-mission-${mission.id}`}
                        onClick={() => onNavigateTab(navTab)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                      >
                        <span>Go Task</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                      
                      <button
                        title="Simulate action for testing"
                        onClick={() => handleSimulateAction(mission.category)}
                        className="px-1.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-[9px] font-mono cursor-pointer border border-white/5"
                      >
                        ⚡
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
