import React, { useState } from "react";
import { motion } from "motion/react";
import { AIAgent } from "../../types";
import { AgunnayaDatabase } from "../../lib/db";
import ImageWithFallback from "../ImageWithFallback";
import { ArrowLeft, Target, ListChecks, Plus, Trash2, Save, AudioLines } from "lucide-react";

interface AgentSettingsPageProps {
  agent: AIAgent;
  onBack: () => void;
  onSaved: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

type AgentTone = NonNullable<AIAgent["tone"]>;

const TONE_OPTIONS: Array<{ value: AgentTone; label: string }> = [
  { value: "professional", label: "Professional" },
  { value: "witty", label: "Witty" },
  { value: "concise", label: "Concise" },
  { value: "friendly", label: "Friendly" },
  { value: "analytical", label: "Analytical" }
];

interface ListEditorProps {
  idPrefix: string;
  title: string;
  icon: React.ReactNode;
  items: string[];
  placeholder: string;
  emptyText: string;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}

function ListEditor({ idPrefix, title, icon, items, placeholder, emptyText, onAdd, onRemove }: ListEditorProps) {
  const [input, setInput] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    onAdd(value);
    setInput("");
  };

  return (
    <div className="space-y-2.5">
      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">{title}</label>

      <form onSubmit={handleAdd} className="flex gap-1.5">
        <input
          id={`${idPrefix}-input`}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          maxLength={140}
          className="flex-1 bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-purple/40"
        />
        <button
          id={`${idPrefix}-add-btn`}
          type="submit"
          disabled={!input.trim()}
          className="px-3 bg-brand-purple/20 hover:bg-brand-purple text-brand-purple hover:text-white border border-brand-purple/30 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:hover:bg-brand-purple/20 disabled:hover:text-brand-purple"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-[10px] text-zinc-600 font-mono bg-black/30 border border-dashed border-white/5 rounded-xl p-3 text-center">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li
              key={`${idPrefix}-item-${idx}`}
              className="flex items-start gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-2.5"
            >
              <span className="text-[9px] font-mono font-bold text-brand-purple bg-brand-purple/10 border border-brand-purple/20 rounded-md px-1.5 py-0.5 shrink-0 mt-px">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="text-[11px] text-zinc-300 leading-normal flex-1">{item}</span>
              <button
                id={`${idPrefix}-remove-btn-${idx}`}
                type="button"
                onClick={() => onRemove(idx)}
                className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer shrink-0 mt-px"
                aria-label={`Remove ${title} ${idx + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[9px] text-zinc-600 font-mono flex items-center gap-1">{icon}</p>
    </div>
  );
}

export default function AgentSettingsPage({ agent, onBack, onSaved, addTerminalLog, showToast }: AgentSettingsPageProps) {
  const [tone, setTone] = useState<AgentTone>(agent.tone || "professional");
  const [goals, setGoals] = useState<string[]>(agent.goals || []);
  const [responsibilities, setResponsibilities] = useState<string[]>(agent.primaryResponsibilities || []);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    const updated: AIAgent = {
      ...agent,
      tone,
      goals: goals.map(g => g.trim()).filter(Boolean),
      primaryResponsibilities: responsibilities.map(r => r.trim()).filter(Boolean)
    };
    AgunnayaDatabase.saveAgent(updated);
    addTerminalLog("success", `Agent settings synced for ${updated.name} (${updated.symbol}): tone=${tone}, ${updated.goals.length} goals, ${updated.primaryResponsibilities.length} primary responsibilities.`);
    showToast(`Settings saved for ${updated.name} ($${updated.symbol}).`, "success");
    setSaving(false);
    onSaved();
  };

  return (
    <motion.div
      key="agent-settings-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className="max-w-3xl mx-auto"
    >
      <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <button
            id="agent-settings-back-btn"
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-zinc-400 hover:text-white bg-zinc-950 border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Agent Forge</span>
          </button>
          <span className="text-[9px] font-mono font-bold text-brand-purple uppercase tracking-widest">Agent Configuration</span>
        </div>

        {/* Agent Identity */}
        <div className="flex gap-3 items-center">
          <ImageWithFallback src={agent.avatarUrl} alt={agent.name} fallbackText={agent.symbol} className="w-12 h-12 rounded-xl object-cover border border-white/5 shrink-0" />
          <div>
            <h2 className="font-display font-bold text-white text-sm">{agent.name}</h2>
            <span className="block text-[9px] font-mono text-brand-purple font-bold uppercase">{agent.symbol} Agent</span>
            <span className="block text-[8px] font-mono text-zinc-500 truncate max-w-[220px]">{agent.contractAddress}</span>
          </div>
        </div>

        {/* Communication Tone */}
        <div className="space-y-2.5">
          <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">Communication Tone</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-white/10">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                id={`agent-settings-tone-${opt.value}`}
                type="button"
                onClick={() => setTone(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  tone === opt.value
                    ? "bg-brand-purple text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <AudioLines className="w-3 h-3" />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-zinc-600 font-mono flex items-center gap-1">
            <AudioLines className="w-3 h-3" /> The tone directive is injected into this agent's cognitive system prompt on every query.
          </p>
        </div>

        {/* Specific Goals */}
        <ListEditor
          idPrefix="agent-settings-goal"
          title="Specific Goals"
          icon={<Target className="w-3 h-3 text-brand-purple" />}
          items={goals}
          placeholder="e.g. Grow staking TVL above 500 ETH this quarter"
          emptyText="No specific goals configured — the agent runs on its base directives only."
          onAdd={(value) => setGoals(prev => [...prev, value])}
          onRemove={(index) => setGoals(prev => prev.filter((_, i) => i !== index))}
        />

        {/* Primary Responsibilities */}
        <ListEditor
          idPrefix="agent-settings-responsibility"
          title="Primary Responsibilities"
          icon={<ListChecks className="w-3 h-3 text-brand-purple" />}
          items={responsibilities}
          placeholder="e.g. Monitor liquidity pool depth and rebalance weekly"
          emptyText="No primary responsibilities configured — the agent follows its description only."
          onAdd={(value) => setResponsibilities(prev => [...prev, value])}
          onRemove={(index) => setResponsibilities(prev => prev.filter((_, i) => i !== index))}
        />

        {/* Save */}
        <button
          id="agent-settings-save-btn"
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-brand-purple hover:bg-purple-600 text-white text-xs font-bold font-mono rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Syncing Settings..." : "Save Agent Settings"}</span>
        </button>
      </div>
    </motion.div>
  );
}
