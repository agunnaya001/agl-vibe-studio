import { useState, useEffect } from "react";
import { 
  Mail, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  Download, 
  Search, 
  Bot, 
  FileText, 
  Layers, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Inbox,
  Clock,
  Check,
  ChevronRight,
  Shield,
  SendHorizontal
} from "lucide-react";
import { GmailService, GmailMessageSummary, GmailLabel } from "../lib/gmailService";
import { AgunnayaDatabase } from "../lib/db";
import { User } from "firebase/auth";
import { WalletState } from "../types";
import { validateAndConsumeCredits, CREDIT_COSTS } from "../lib/credits";
import InsufficientCreditsModal from "../components/InsufficientCreditsModal";

interface GmailPageProps {
  firebaseUser: User | null;
  driveAccessToken: string | null;
  onAuthorizeDrive: () => void;
  addTerminalLog: (type: "system" | "success" | "error" | "info", text: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  wallet?: WalletState;
  onRefreshWallet?: () => void;
}

export default function GmailPage({
  firebaseUser,
  driveAccessToken,
  onAuthorizeDrive,
  addTerminalLog,
  showToast,
  wallet,
  onRefreshWallet
}: GmailPageProps) {
  // Gmail state
  const [emails, setEmails] = useState<GmailMessageSummary[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string>("INBOX");

  // Insufficient Credits Modal State
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false);
  const [creditsModalData, setCreditsModalData] = useState({ featureName: "", required: 0, available: 0 });

  // Compose State
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // AI drafting State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [activeAgents, setActiveAgents] = useState<any[]>([]);

  // Fetch agents on mount to allow persona drafting
  useEffect(() => {
    setActiveAgents(AgunnayaDatabase.getAgents());
  }, []);

  // Sync emails when token is available
  useEffect(() => {
    if (driveAccessToken) {
      fetchGmailData();
    }
  }, [driveAccessToken, selectedLabel]);

  const fetchGmailData = async () => {
    if (!driveAccessToken) return;
    setIsLoading(true);
    addTerminalLog("info", `GMAIL: Querying user mailbox folders for [${selectedLabel}]...`);
    try {
      // 1. Load labels
      const labelList = await GmailService.listLabels(driveAccessToken);
      setLabels(labelList.filter(l => l.type === "system" || l.name.startsWith("Category")));

      // 2. Load messages based on active query
      let query = `label:${selectedLabel}`;
      if (searchQuery.trim()) {
        query += ` ${searchQuery.trim()}`;
      }

      const { messages } = await GmailService.listMessages(driveAccessToken, query, 12);
      
      // Fetch details of each message concurrently
      const summaries = await Promise.all(
        messages.map(async (msg) => {
          try {
            return await GmailService.getMessageDetails(driveAccessToken, msg.id);
          } catch (e) {
            return {
              id: msg.id,
              threadId: msg.threadId,
              subject: "Failed to load message body",
              from: "Unknown",
            } as GmailMessageSummary;
          }
        })
      );

      setEmails(summaries);
      addTerminalLog("success", `GMAIL: Successfully synced ${summaries.length} email records.`);
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `GMAIL_ERROR: Synchronization failed. ${error instanceof Error ? error.message : String(error)}`);
      showToast("Failed to fetch Gmail list. Check permissions.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEmail = async (email: GmailMessageSummary) => {
    setIsDetailLoading(true);
    setSelectedEmail(email);
    addTerminalLog("info", `GMAIL: Opening mail item [${email.id}]...`);
    try {
      const details = await GmailService.getMessageDetails(driveAccessToken!, email.id);
      setSelectedEmail(details);
      addTerminalLog("success", `GMAIL: Opened message: "${details.subject}"`);
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `GMAIL_ERROR: Failed to load complete thread content.`);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      showToast("To, Subject, and Body are required fields.", "error");
      return;
    }

    setIsSending(true);
    addTerminalLog("info", `GMAIL: Compiling message mime-type and dispatching to [${composeTo}]...`);
    try {
      await GmailService.sendMessage(driveAccessToken!, composeTo, composeSubject, composeBody);
      showToast("Email dispatched successfully via Gmail!", "success");
      addTerminalLog("success", `GMAIL: Sent message to [${composeTo}].`);
      
      // Reset compose state
      setIsComposing(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      fetchGmailData();
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `GMAIL_SEND_ERROR: ${error instanceof Error ? error.message : String(error)}`);
      showToast("Failed to dispatch email.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateDraftOnly = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      showToast("Recipient and subject required to save draft.", "error");
      return;
    }

    setIsSending(true);
    addTerminalLog("info", "GMAIL: Syncing and saving draft to your Cloud mailbox...");
    try {
      await GmailService.createDraft(driveAccessToken!, composeTo, composeSubject, composeBody);
      showToast("Draft successfully saved to your Gmail drafts!", "success");
      addTerminalLog("success", "GMAIL: Draft created successfully.");
      setIsComposing(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `GMAIL_DRAFT_ERROR: ${error instanceof Error ? error.message : String(error)}`);
      showToast("Failed to create draft.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleTrashMessage = async (msgId: string) => {
    const confirmed = window.confirm("Move this message to Trash in your Gmail?");
    if (!confirmed) return;

    setIsLoading(true);
    addTerminalLog("info", `GMAIL: Trashing message ID [${msgId}]...`);
    try {
      await GmailService.trashMessage(driveAccessToken!, msgId);
      showToast("Message moved to trash.", "success");
      addTerminalLog("success", "GMAIL: Deletion confirmed.");
      setSelectedEmail(null);
      fetchGmailData();
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `GMAIL_TRASH_ERROR: ${error instanceof Error ? error.message : String(error)}`);
      showToast("Failed to trash message.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAIDraft = async (isReply = false) => {
    const activePrompt = aiPrompt.trim();
    if (!activePrompt) {
      showToast("Please enter an instruction or prompt for the AI draft.", "error");
      return;
    }

    let creditResult: any = null;
    if (wallet && showToast) {
      creditResult = validateAndConsumeCredits({
        wallet,
        onRefreshWallet: onRefreshWallet || (() => {}),
        requiredCredits: CREDIT_COSTS.EMAIL_DRAFT,
        featureName: "AI Email Assistant",
        showToast,
        addTerminalLog,
        onRequestCreditsModal: (featureName, required, available) => {
          setCreditsModalData({ featureName, required, available });
          setInsufficientCreditsModalOpen(true);
        }
      });

      if (!creditResult.success) {
        setIsDrafting(false);
        return;
      }
    }

    setIsDrafting(true);
    addTerminalLog("info", `GEMINI_API: Contacting server to draft email utilizing model [gemini-3.6-flash]...`);

    const selectedAgent = activeAgents.find(a => a.id === selectedAgentId);

    try {
      const response = await fetch("/api/ai/draft-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: activePrompt,
          originalEmail: isReply ? selectedEmail : null,
          agentProfile: selectedAgent ? {
            name: selectedAgent.name,
            symbol: selectedAgent.symbol,
            description: selectedAgent.description
          } : null
        })
      });

      if (!response.ok) throw new Error("AI Endpoint returned an error.");

      const result = await response.json();

      if (isReply) {
        // Set up the compose state for a reply
        setComposeTo(selectedEmail?.from || "");
        setComposeSubject(result.subject || `Re: ${selectedEmail?.subject}`);
        setComposeBody(result.body || "");
      } else {
        // New email compose state
        setComposeSubject(result.subject || "");
        setComposeBody(result.body || "");
      }

      setIsComposing(true);
      setAiPrompt("");
      showToast("AI Draft generated successfully!", "success");
      addTerminalLog("success", `GEMINI_API: Email payload compiled successfully in-context.`);
    } catch (error) {
      console.error(error);
      if (creditResult) creditResult.refund();
      addTerminalLog("error", "GEMINI_ERROR: Draft writing failure. Model pipeline returned 500.");
      showToast("AI drafting failed. Your credits have been refunded.", "error");
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div id="gmail-integration-hub" className="space-y-8 max-w-7xl mx-auto px-4 py-6">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-500 animate-pulse" />
            <span>Gmail Workspace Hub</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-2 max-w-2xl">
            Integrate your official Gmail mailbox with Agunnaya Labs Studio. Directly read client queries, deploy custom responses with autonomous Web3 AI Agent personas, and broadcast DAO status updates seamlessly.
          </p>
        </div>

        {driveAccessToken && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsComposing(true);
                setComposeTo("");
                setComposeSubject("");
                setComposeBody("");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-mono font-bold text-white transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Email</span>
            </button>
            <button
              onClick={fetchGmailData}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-xs font-mono text-zinc-300 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync Inbox</span>
            </button>
          </div>
        )}
      </div>

      {!driveAccessToken ? (
        /* Auth Guard Panel */
        <div className="bg-gradient-to-b from-zinc-950 to-black border border-white/10 rounded-2xl p-10 text-center max-w-xl mx-auto space-y-6 shadow-xl shadow-black/50">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto text-blue-400 border border-blue-500/20">
            <Mail className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-display">Authorize Gmail Studio Access</h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-sans">
              To read communications, draft responses with your personalized blockchain AI agents, and manage operations, please grant secure access to your Google Gmail mailbox.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button 
              onClick={onAuthorizeDrive}
              className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-zinc-100 text-zinc-950 font-medium font-mono text-xs rounded-xl shadow-lg transition-all transform active:scale-98"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>Verify Mailbox Access</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono">
            Requires secure authorization for scopes: mail.google.com, gmail.modify, gmail.send
          </div>
        </div>
      ) : (
        /* Dynamic Split View Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Side Folders & Search Panel */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Search Input */}
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-3">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Search Messages</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. from:support or solidity"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchGmailData()}
                  className="w-full bg-black border border-white/10 focus:border-blue-500/50 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-white focus:outline-none placeholder-zinc-600"
                />
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              </div>
            </div>

            {/* Inbox Folders list */}
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4">
              <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 px-2">Folders</span>
              <div className="space-y-1">
                {[
                  { id: "INBOX", label: "Inbox", icon: Inbox },
                  { id: "SENT", label: "Sent Mail", icon: SendHorizontal },
                  { id: "DRAFT", label: "Drafts", icon: FileText },
                  { id: "TRASH", label: "Trash", icon: Trash2 },
                ].map((folder) => {
                  const Icon = folder.icon;
                  const isActive = selectedLabel === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedLabel(folder.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono rounded-lg transition-all ${
                        isActive 
                          ? "bg-blue-500/10 border-l-2 border-blue-500 text-blue-400 font-bold" 
                          : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{folder.label}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-zinc-600" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] uppercase tracking-widest font-mono">Sandbox Protected</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                OAuth access tokens are cached solely in browser runtime memory. Your credentials never bypass standard Google API gateways.
              </p>
            </div>

          </div>

          {/* Center Column: Inbox Message List */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-[500px]">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <span className="text-xs font-bold font-mono uppercase text-white flex items-center gap-1.5">
                    <span>{selectedLabel} Snapshots</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{emails.length} Mail items</span>
                </div>

                {isLoading ? (
                  <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="text-xs font-mono text-zinc-500">Retrieving secure SMTP packages...</span>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-6 space-y-3">
                    <Inbox className="w-8 h-8 text-zinc-600" />
                    <span className="text-xs font-bold font-mono text-zinc-400">No messages found</span>
                    <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                      There are no active messages matching label {selectedLabel}. Let's write a new draft!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                    {emails.map((email) => {
                      const isChosen = selectedEmail?.id === email.id;
                      const dateStr = email.date 
                        ? new Date(email.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : "Today";

                      return (
                        <div
                          key={email.id}
                          onClick={() => handleSelectEmail(email)}
                          className={`p-3.5 rounded-xl border cursor-pointer text-left transition-all ${
                            isChosen 
                              ? "bg-blue-500/10 border-blue-500/30" 
                              : "bg-black hover:bg-zinc-900 border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold font-mono text-zinc-300 truncate max-w-[140px]">
                              {email.from?.replace(/<.*>/, "")}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">{dateStr}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white truncate mt-1.5 font-mono">
                            {email.subject}
                          </h4>
                          <p className="text-[10px] text-zinc-400 truncate mt-1 line-clamp-1">
                            {email.snippet}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Reader & Composer Panel */}
          <div className="lg:col-span-5 flex flex-col h-full">
            
            {/* If user clicked Compose or wants to send/draft */}
            {isComposing ? (
              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <span className="text-xs font-bold font-mono uppercase text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-400" />
                      <span>Compose SMTP Package</span>
                    </span>
                    <button 
                      onClick={() => setIsComposing(false)}
                      className="text-[10px] font-mono text-zinc-500 hover:text-white"
                    >
                      [Cancel]
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">To (Recipient)</label>
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={composeTo}
                        onChange={(e) => setComposeTo(e.target.value)}
                        className="w-full bg-black border border-white/10 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">Subject</label>
                      <input
                        type="text"
                        placeholder="Enter email subject"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        className="w-full bg-black border border-white/10 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase">HTML Body / Content</label>
                      <textarea
                        rows={8}
                        placeholder="Write your email body here. HTML formatting tags are supported."
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        className="w-full bg-black border border-white/10 focus:border-blue-500/50 rounded-xl p-3.5 text-xs font-mono text-white focus:outline-none resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={handleSendEmail}
                    disabled={isSending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? "Dispatching..." : "Send Message"}</span>
                  </button>
                  
                  <button
                    onClick={handleCreateDraftOnly}
                    disabled={isSending}
                    className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 font-mono text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50"
                    title="Save to Gmail Drafts folder"
                  >
                    <span>Save Draft</span>
                  </button>
                </div>
              </div>
            ) : selectedEmail ? (
              /* Email Reader Panel */
              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 space-y-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate font-mono">
                        {selectedEmail.subject}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-500">
                        <span>From: {selectedEmail.from}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTrashMessage(selectedEmail.id)}
                      className="p-2 rounded-lg bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all shrink-0"
                      title="Move email to trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isDetailLoading ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="text-xs font-mono text-zinc-500">Downloading raw body content...</span>
                    </div>
                  ) : (
                    <div className="space-y-6 mt-4">
                      {/* Message body container */}
                      <div className="bg-black border border-white/5 rounded-xl p-4 max-h-[300px] overflow-y-auto leading-relaxed text-xs text-zinc-300 font-sans">
                        {selectedEmail.body?.startsWith("<") || selectedEmail.body?.includes("</") ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: selectedEmail.body }} 
                            className="space-y-2 select-text"
                          />
                        ) : (
                          <div className="whitespace-pre-wrap select-text">{selectedEmail.body}</div>
                        )}
                      </div>

                      {/* AI Agent Draft Reply Section */}
                      <div className="border border-white/10 rounded-xl p-4 bg-blue-950/10 space-y-3">
                        <div className="flex items-center gap-2 text-blue-400">
                          <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                            AI Agent Response Draft writer
                          </span>
                        </div>

                        <p className="text-[10px] text-zinc-400 leading-normal">
                          Instruct an AI core or your deployed customized Agent persona to write an automatic response template for this message.
                        </p>

                        {/* Agent Selector */}
                        <div className="space-y-1">
                          <label className="block text-[9px] font-mono text-zinc-500 uppercase">Write with Persona</label>
                          <select
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-white focus:outline-none"
                          >
                            <option value="">Generic Studio Assistant</option>
                            {activeAgents.map(agent => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name} ({agent.symbol})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Prompt Input */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. Ask them to wait 2 days or Accept offer"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg pl-3 pr-16 py-2 text-xs font-mono text-white placeholder-zinc-700 focus:outline-none"
                          />
                          <button
                            onClick={() => handleGenerateAIDraft(true)}
                            disabled={isDrafting}
                            className="absolute right-1 top-1 py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] transition-all disabled:opacity-50"
                          >
                            {isDrafting ? "Drafting..." : "Compose"}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-600">ID: {selectedEmail.id}</span>
                  <button
                    onClick={() => {
                      setIsComposing(true);
                      setComposeTo(selectedEmail.from || "");
                      setComposeSubject(`Re: ${selectedEmail.subject}`);
                      setComposeBody(`\n\nOn ${selectedEmail.date || "recent date"}, ${selectedEmail.from} wrote:\n> ${selectedEmail.snippet}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-white border border-white/10"
                  >
                    <span>Reply Manual</span>
                  </button>
                </div>
              </div>
            ) : (
              /* No selection placeholder card */
              <div className="bg-[#09090b] border border-white/10 rounded-2xl p-12 text-center flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center text-zinc-700 border border-white/5">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-400 font-mono">Select an Email</span>
                  <p className="text-[10px] text-zinc-600 max-w-xs mx-auto mt-1">
                    Click any email snapshot in the inbox feed to view raw thread assets, compose drafts, or use AI Agent reply templates.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsComposing(true);
                      setComposeTo("");
                      setComposeSubject("");
                      setComposeBody("");
                    }}
                    className="py-1.5 px-3 rounded-lg border border-white/15 hover:bg-white/5 text-xs font-mono text-white transition-all"
                  >
                    Compose New Email
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={insufficientCreditsModalOpen}
        onClose={() => setInsufficientCreditsModalOpen(false)}
        featureName={creditsModalData.featureName}
        requiredCredits={creditsModalData.required}
        availableCredits={creditsModalData.available}
        onNavigateToCredits={() => {
          window.location.href = "/?tab=agl-credits";
        }}
      />
    </div>
  );
}
