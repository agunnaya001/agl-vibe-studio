import { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Eye, 
  Send, 
  CheckCircle2, 
  HelpCircle, 
  MessageSquare, 
  Sparkles, 
  ListPlus, 
  Lock, 
  Globe, 
  AlertTriangle,
  Layers,
  Search,
  Check,
  Building2,
  Share2
} from "lucide-react";
import { User } from "firebase/auth";
import { GoogleFormsService, GoogleForm, GoogleFormResponse } from "../lib/formsService";

interface GoogleFormsPageProps {
  firebaseUser: User | null;
  driveAccessToken: string | null;
  onAuthorizeForms: () => void;
  addTerminalLog: (type: "system" | "success" | "error" | "info", text: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function GoogleFormsPage({
  firebaseUser,
  driveAccessToken,
  onAuthorizeForms,
  addTerminalLog,
  showToast,
}: GoogleFormsPageProps) {
  const [formsList, setFormsList] = useState<Array<{ id: string; name: string; createdTime?: string; webViewLink?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected active form state
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFormDetails, setSelectedFormDetails] = useState<GoogleForm | null>(null);
  const [formResponses, setFormResponses] = useState<GoogleFormResponse[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"questions" | "responses">("questions");

  // Create Form Form state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  
  // New Question state
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionType, setQuestionType] = useState<"TEXT" | "PARAGRAPH" | "RADIO" | "CHECKBOX" | "DROP_DOWN">("RADIO");
  const [questionOptions, setQuestionOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [questionRequired, setQuestionRequired] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Template Quick-Selects
  const TEMPLATES = [
    {
      title: "DAO Governance Community Poll",
      description: "Gather feedback from token holders regarding upcoming Web3 proposal votes.",
      questions: [
        { title: "Should Agunnaya Labs initiate Protocol Fee Auto-Burn?", type: "RADIO" as const, options: ["Yes - Burn 50% Fees", "No - Keep in Treasury", "Abstain"] },
        { title: "Provide any comments or additional governance recommendations:", type: "PARAGRAPH" as const, options: [] }
      ]
    },
    {
      title: "Web3 Ecosystem Airdrop Eligibility Verification",
      description: "Verify community wallet addresses and social handles for upcoming $AGL token distributions.",
      questions: [
        { title: "Your Primary EVM Wallet Address (Base / Sepolia):", type: "TEXT" as const, options: [] },
        { title: "Which Web3 products do you use most frequently?", type: "CHECKBOX" as const, options: ["DEX Swap", "Staking Vaults", "AI Agents", "GameFi Arcade", "DAO Voting"] }
      ]
    },
    {
      title: "Smart Contract Audit Request Form",
      description: "Submit custom smart contracts to Agunnaya AI Security Audit engine.",
      questions: [
        { title: "Contract Name & Network:", type: "TEXT" as const, options: [] },
        { title: "Audit Target Level:", type: "DROP_DOWN" as const, options: ["Basic Static Analysis", "Deep Formal Verification", "Full Economic Security Audit"] },
        { title: "Paste Contract Solidity Code or GitHub Link:", type: "PARAGRAPH" as const, options: [] }
      ]
    }
  ];

  // Fetch forms on load if token exists
  useEffect(() => {
    if (driveAccessToken) {
      fetchForms();
    }
  }, [driveAccessToken]);

  const fetchForms = async () => {
    if (!driveAccessToken) return;
    setIsLoading(true);
    try {
      addTerminalLog("info", "GOOGLE_FORMS: Fetching Google Forms files from workspace Drive...");
      const files = await GoogleFormsService.listForms(driveAccessToken);
      setFormsList(files);
      addTerminalLog("success", `GOOGLE_FORMS: Found ${files.length} active forms.`);
      
      if (files.length > 0 && !selectedFormId) {
        handleSelectForm(files[0].id);
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("error", `GOOGLE_FORMS_ERROR: ${err.message}`);
      showToast("Could not load Google Forms.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectForm = async (formId: string) => {
    if (!driveAccessToken) return;
    setSelectedFormId(formId);
    setIsLoadingDetails(true);

    try {
      addTerminalLog("info", `GOOGLE_FORMS: Loading details and submitted responses for Form ID [${formId}]...`);
      const formDetails = await GoogleFormsService.getForm(driveAccessToken, formId);
      setSelectedFormDetails(formDetails);

      const responses = await GoogleFormsService.getFormResponses(driveAccessToken, formId).catch(() => []);
      setFormResponses(responses);

      addTerminalLog("success", `GOOGLE_FORMS: Loaded Form "${formDetails.info?.title}" with ${responses.length} responses.`);
    } catch (err: any) {
      console.error(err);
      addTerminalLog("error", `GOOGLE_FORMS_ERROR: ${err.message}`);
      showToast("Failed to load form details.", "error");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateForm = async (template?: typeof TEMPLATES[0]) => {
    if (!driveAccessToken) {
      showToast("Please authorize Google Forms access first.", "error");
      return;
    }

    const titleToUse = template ? template.title : newTitle.trim();
    const descToUse = template ? template.description : newDescription.trim();

    if (!titleToUse) {
      showToast("Please enter a title for the Google Form.", "error");
      return;
    }

    setIsCreating(true);
    addTerminalLog("info", `GOOGLE_FORMS: Initializing Google Form "${titleToUse}" via Google Forms REST API...`);

    try {
      const createdForm = await GoogleFormsService.createForm(driveAccessToken, titleToUse, descToUse);
      
      // If template had preset questions, add them sequentially
      if (template && template.questions) {
        for (const q of template.questions) {
          await GoogleFormsService.addQuestion(
            driveAccessToken,
            createdForm.formId,
            q.title,
            q.type,
            q.options,
            true
          );
        }
      }

      addTerminalLog("success", `GOOGLE_FORMS: Created Form "${titleToUse}" (ID: ${createdForm.formId}).`);
      showToast("🎉 Google Form created successfully!", "success");

      setNewTitle("");
      setNewDescription("");
      
      await fetchForms();
      handleSelectForm(createdForm.formId);
    } catch (err: any) {
      console.error(err);
      addTerminalLog("error", `GOOGLE_FORMS_ERROR: Creation failed. ${err.message}`);
      showToast(`Form creation failed: ${err.message}`, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddQuestionToActiveForm = async () => {
    if (!driveAccessToken || !selectedFormId) return;

    if (!questionTitle.trim()) {
      showToast("Please enter a question title.", "error");
      return;
    }

    setIsAddingQuestion(true);
    addTerminalLog("info", `GOOGLE_FORMS: Adding new question item "${questionTitle}" to form...`);

    try {
      await GoogleFormsService.addQuestion(
        driveAccessToken,
        selectedFormId,
        questionTitle.trim(),
        questionType,
        questionOptions.filter(o => o.trim() !== ""),
        questionRequired
      );

      addTerminalLog("success", `GOOGLE_FORMS: Added question "${questionTitle}" successfully.`);
      showToast("Question added to Google Form!", "success");

      setQuestionTitle("");
      setQuestionOptions(["Option 1", "Option 2"]);
      
      // Refresh form details
      handleSelectForm(selectedFormId);
    } catch (err: any) {
      console.error(err);
      addTerminalLog("error", `GOOGLE_FORMS_ERROR: Could not add question. ${err.message}`);
      showToast(`Failed to add question: ${err.message}`, "error");
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleDeleteForm = async (fileId: string, title: string) => {
    if (!driveAccessToken) return;

    // MANDATORY User confirmation dialog for destructive file operations
    const confirmed = window.confirm(
      `DELETE GOOGLE FORM:\nAre you sure you want to permanently delete "${title}"?\n\nThis will remove the Google Form and all collected responses from your Google Drive account.`
    );
    if (!confirmed) return;

    addTerminalLog("info", `GOOGLE_FORMS: Deleting Form file [${fileId}]...`);
    try {
      await GoogleFormsService.deleteForm(driveAccessToken, fileId);
      addTerminalLog("success", `GOOGLE_FORMS: Deleted Form "${title}" successfully.`);
      showToast("Google Form deleted.", "success");

      if (selectedFormId === fileId) {
        setSelectedFormId(null);
        setSelectedFormDetails(null);
        setFormResponses([]);
      }

      fetchForms();
    } catch (err: any) {
      console.error(err);
      addTerminalLog("error", `GOOGLE_FORMS_ERROR: Deletion failed. ${err.message}`);
      showToast("Failed to delete form.", "error");
    }
  };

  const filteredForms = formsList.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="google-forms-view" className="space-y-8 max-w-7xl mx-auto px-4 py-6 font-sans">
      
      {/* Title & Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold mb-1">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>GOOGLE WORKSPACE INTEGRATION</span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded-full border border-purple-500/30">
              FORMS REST API v1
            </span>
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-purple-400 animate-pulse" />
            <span>Google Forms Manager & Collector</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Create, manage, and analyze Google Forms directly within Agunnaya Labs Studio. Collect DAO voting feedback, community airdrop registrations, and smart contract audit requests seamlessly.
          </p>
        </div>

        {driveAccessToken && (
          <button
            onClick={fetchForms}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-purple-500/40 text-xs font-mono text-zinc-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Forms</span>
          </button>
        )}
      </div>

      {/* Connection Guard if OAuth not granted */}
      {!driveAccessToken ? (
        <div className="bg-gradient-to-b from-zinc-950 to-black border border-purple-500/20 rounded-3xl p-10 text-center max-w-xl mx-auto space-y-6 shadow-2xl shadow-purple-950/20">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto text-purple-400 border border-purple-500/30">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-display">Connect Google Forms API</h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Authenticate your Google account with Forms & Drive permissions to start generating community surveys, voting polls, and reading submitted responses in real time.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button 
              onClick={onAuthorizeForms}
              className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-zinc-100 text-zinc-950 font-bold font-mono text-xs rounded-xl shadow-xl transition-all transform active:scale-98 cursor-pointer"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>Connect Google Forms API</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono">
            Requires scopes: forms.body, forms.responses.readonly, drive.file
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Quick Template Presets Bar */}
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-zinc-900 to-zinc-900 space-y-4">
            <div className="flex items-center gap-2 text-white font-display font-bold text-sm">
              <Sparkles className="w-4 h-4 text-purple-400 animate-bounce" />
              <span>1-Click Web3 Google Form Templates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map((tmpl, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col justify-between space-y-3 hover:border-purple-500/40 transition-all group">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                      {tmpl.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCreateForm(tmpl)}
                    disabled={isCreating}
                    className="w-full py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 border border-purple-500/30 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Deploy Template</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Main Grid: Form Creator + Forms List & Responses */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left 4 Cols: Create New Form Panel & Forms List */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Form Creation Box */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-white font-bold text-xs font-display">
                  <ListPlus className="w-4 h-4 text-purple-400" />
                  <span>Create Custom Google Form</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Form Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Agunnaya AI User Survey"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Description (Optional)</label>
                    <textarea
                      placeholder="Provide instructions for form respondents..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <button
                    onClick={() => handleCreateForm()}
                    disabled={isCreating || !newTitle.trim()}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-600/20"
                  >
                    {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isCreating ? "Creating Form..." : "Create Form"}</span>
                  </button>
                </div>
              </div>

              {/* Forms List Box */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-xs font-display">
                    <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                    <span>Your Google Forms</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{formsList.length} Files</span>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search forms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Forms Scroll Area */}
                {isLoading ? (
                  <div className="py-12 text-center text-xs font-mono text-zinc-500 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                    <span>Syncing with Google Drive...</span>
                  </div>
                ) : filteredForms.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-xl p-4">
                    No Google Forms found. Deploy one using a template above or create a new custom form.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredForms.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => handleSelectForm(file.id)}
                        className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          selectedFormId === file.id
                            ? "bg-purple-950/40 border-purple-500/60 text-white font-bold"
                            : "bg-black/60 border-white/5 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-medium">{file.name}</h4>
                          <span className="text-[10px] text-zinc-500 font-mono block">
                            {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : "Active"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteForm(file.id, file.name)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                            title="Delete Form"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right 8 Cols: Selected Form Details, Add Question, & Responses Viewer */}
            <div className="lg:col-span-8">
              {!selectedFormId ? (
                <div className="p-16 text-center border-2 border-dashed border-white/10 rounded-3xl bg-zinc-950/50 flex flex-col items-center justify-center space-y-4">
                  <FileSpreadsheet className="w-12 h-12 text-zinc-700" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No Form Selected</h3>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      Select a form from your list or create a new one to manage questions and view submitted responses.
                    </p>
                  </div>
                </div>
              ) : isLoadingDetails ? (
                <div className="p-20 text-center bg-zinc-950 border border-white/10 rounded-3xl flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                  <span className="text-xs font-mono text-zinc-400">Loading Form structure and responses...</span>
                </div>
              ) : selectedFormDetails ? (
                <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-6 shadow-2xl">
                  
                  {/* Form Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                          Form ID: {selectedFormDetails.formId}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold font-display text-white">
                        {selectedFormDetails.info?.title || "Google Form"}
                      </h2>
                      {selectedFormDetails.info?.description && (
                        <p className="text-xs text-zinc-400">
                          {selectedFormDetails.info.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {selectedFormDetails.responderUri && (
                        <a
                          href={selectedFormDetails.responderUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Public Form</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Tab Selector: Questions vs Responses */}
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3 font-mono text-xs">
                    <button
                      onClick={() => setActiveTab("questions")}
                      className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === "questions"
                          ? "bg-purple-600 text-white font-bold"
                          : "bg-black/40 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Questions ({selectedFormDetails.items?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("responses")}
                      className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === "responses"
                          ? "bg-purple-600 text-white font-bold"
                          : "bg-black/40 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Submitted Responses ({formResponses.length})</span>
                    </button>
                  </div>

                  {/* Tab Content: Questions View + Add Question */}
                  {activeTab === "questions" && (
                    <div className="space-y-6">
                      
                      {/* Add Question Component */}
                      <div className="p-5 rounded-2xl bg-black/60 border border-purple-500/30 space-y-4">
                        <div className="flex items-center gap-2 text-white font-bold text-xs font-display">
                          <Plus className="w-4 h-4 text-purple-400" />
                          <span>Add New Question Item to Form</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                          <div>
                            <label className="text-[10px] text-zinc-400 uppercase block mb-1">Question Text</label>
                            <input
                              type="text"
                              placeholder="e.g. What features do you want next?"
                              value={questionTitle}
                              onChange={(e) => setQuestionTitle(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-zinc-400 uppercase block mb-1">Response Format</label>
                            <select
                              value={questionType}
                              onChange={(e: any) => setQuestionType(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                            >
                              <option value="RADIO">Multiple Choice (Radio)</option>
                              <option value="CHECKBOX">Checkboxes</option>
                              <option value="DROP_DOWN">Dropdown List</option>
                              <option value="TEXT">Short Answer Text</option>
                              <option value="PARAGRAPH">Paragraph Text</option>
                            </select>
                          </div>
                        </div>

                        {["RADIO", "CHECKBOX", "DROP_DOWN"].includes(questionType) && (
                          <div className="space-y-2 text-xs font-mono">
                            <label className="text-[10px] text-zinc-400 uppercase block">Choice Options</label>
                            {questionOptions.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const updated = [...questionOptions];
                                    updated[oIdx] = e.target.value;
                                    setQuestionOptions(updated);
                                  }}
                                  className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-purple-500/50"
                                />
                                {questionOptions.length > 1 && (
                                  <button
                                    onClick={() => setQuestionOptions(questionOptions.filter((_, i) => i !== oIdx))}
                                    className="p-1.5 text-zinc-500 hover:text-rose-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => setQuestionOptions([...questionOptions, `Option ${questionOptions.length + 1}`])}
                              className="text-[10px] text-purple-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                            >
                              <Plus className="w-3 h-3" /> Add Choice Option
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <label className="flex items-center gap-2 text-xs text-zinc-300 font-mono cursor-pointer">
                            <input
                              type="checkbox"
                              checked={questionRequired}
                              onChange={(e) => setQuestionRequired(e.target.checked)}
                              className="rounded border-white/20 text-purple-600 focus:ring-0"
                            />
                            <span>Required Question</span>
                          </label>

                          <button
                            onClick={handleAddQuestionToActiveForm}
                            disabled={isAddingQuestion || !questionTitle.trim()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isAddingQuestion ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>Add Question</span>
                          </button>
                        </div>
                      </div>

                      {/* Existing Items List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-mono uppercase text-zinc-400 font-bold">Current Questions in Form</h4>
                        
                        {(!selectedFormDetails.items || selectedFormDetails.items.length === 0) ? (
                          <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-2xl">
                            No questions added yet. Use the question builder above to add your first question.
                          </div>
                        ) : (
                          selectedFormDetails.items.map((item, idx) => (
                            <div key={item.itemId || idx} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-xs font-bold text-white flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  {item.title}
                                </span>
                                {item.questionItem?.question?.required && (
                                  <span className="text-[10px] text-rose-400 font-mono">Required</span>
                                )}
                              </div>

                              {item.questionItem?.question?.choiceQuestion?.options && (
                                <div className="pl-7 space-y-1">
                                  {item.questionItem.question.choiceQuestion.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="text-xs text-zinc-400 flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
                                      <span>{opt.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                  {/* Tab Content: Responses Viewer */}
                  {activeTab === "responses" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
                        <span>Total Submissions Recorded: {formResponses.length}</span>
                        <button
                          onClick={() => handleSelectForm(selectedFormId)}
                          className="text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh Submissions
                        </button>
                      </div>

                      {formResponses.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl space-y-2">
                          <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
                          <span className="block text-xs font-bold text-white">No responses submitted yet</span>
                          <p className="text-[11px] text-zinc-500">
                            Share your public form URL with your community to collect responses.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formResponses.map((resp, rIdx) => (
                            <div key={resp.responseId || rIdx} className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs">
                              <div className="flex items-center justify-between text-zinc-500 text-[10px] border-b border-white/5 pb-2">
                                <span>Response #{rIdx + 1} • ID: {resp.responseId}</span>
                                <span>Submitted: {new Date(resp.lastSubmittedTime || resp.createTime).toLocaleString()}</span>
                              </div>

                              <div className="space-y-2 font-sans">
                                {resp.answers && Object.entries(resp.answers).map(([qId, ans]: [string, any]) => {
                                  const questionItem = selectedFormDetails.items?.find(i => i.questionItem?.question?.questionId === qId);
                                  const qTitle = questionItem ? questionItem.title : `Question ${qId.slice(0, 6)}`;
                                  const ansText = ans.textAnswers?.answers?.map((a: any) => a.value).join(", ") || "No answer";

                                  return (
                                    <div key={qId} className="space-y-0.5">
                                      <span className="text-[11px] text-zinc-400 font-bold block">{qTitle}:</span>
                                      <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 font-mono">
                                        {ansText}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : null}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
