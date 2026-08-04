import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible || !installEvent) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-blue-400/30 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl" role="status">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Download size={18} /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Install Agunnaya Studio</p><p className="text-xs leading-5 text-zinc-400">Keep your workspace one tap away, including offline shell access.</p></div>
      <button className="min-h-11 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-500" onClick={async () => { await installEvent.prompt(); setVisible(false); }}>Install</button>
      <button aria-label="Dismiss install prompt" className="grid size-11 shrink-0 place-items-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white" onClick={() => setVisible(false)}><X size={16} /></button>
    </aside>
  );
}
