import { useState, useEffect } from "react";
import { 
  Cloud, 
  CloudOff, 
  UploadCloud, 
  Download, 
  Trash2, 
  RefreshCw, 
  FileJson, 
  Database, 
  Info, 
  CheckCircle, 
  Bot, 
  Coins, 
  AlertTriangle,
  FolderPlus
} from "lucide-react";
import ImageWithFallback from "../components/ImageWithFallback";
import { GoogleDriveService, GoogleDriveFile } from "../lib/driveService";
import { AgunnayaDatabase } from "../lib/db";
import { User } from "firebase/auth";

interface GoogleDrivePageProps {
  firebaseUser: User | null;
  driveAccessToken: string | null;
  onAuthorizeDrive: () => void;
  addTerminalLog: (type: "system" | "success" | "error" | "info", text: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onRefreshAllData: () => void;
}

export default function GoogleDrivePage({
  firebaseUser,
  driveAccessToken,
  onAuthorizeDrive,
  addTerminalLog,
  showToast,
  onRefreshAllData,
}: GoogleDrivePageProps) {
  const [backups, setBackups] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [selectedBackup, setSelectedBackup] = useState<GoogleDriveFile | null>(null);
  
  // Developer File Exporter state
  const [exportType, setExportType] = useState<"agents" | "tokens" | "daos">("agents");
  const [isExporting, setIsExporting] = useState(false);

  // Initialize backup name with date
  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "_");
    const timeStr = today.toTimeString().slice(0, 5).replace(/:/g, "_");
    setBackupName(`agunnaya_backup_${dateStr}_${timeStr}`);
  }, []);

  // Fetch backups whenever token becomes available
  useEffect(() => {
    if (driveAccessToken) {
      fetchBackups();
    }
  }, [driveAccessToken]);

  const fetchBackups = async () => {
    if (!driveAccessToken) return;
    setIsLoading(true);
    try {
      addTerminalLog("info", "GOOGLE_DRIVE: Indexing backup documents in root cloud storage...");
      const files = await GoogleDriveService.listBackups(driveAccessToken);
      setBackups(files);
      addTerminalLog("success", `GOOGLE_DRIVE: Discovered ${files.length} valid workspace backups.`);
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `DRIVE_ERROR: Indexing failed. ${error instanceof Error ? error.message : String(error)}`);
      showToast("Could not index Google Drive backups.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!driveAccessToken) {
      showToast("Please authorize Google Drive access first.", "error");
      return;
    }
    
    const finalName = backupName.trim() || `agunnaya_backup_${Date.now()}`;
    const sanitizedName = finalName.endsWith(".json") ? finalName : `${finalName}.json`;

    setIsBackingUp(true);
    addTerminalLog("info", `GOOGLE_DRIVE: Packaging local workspace state into [${sanitizedName}]...`);
    
    try {
      // Gather all local database states
      const payload = {
        _meta: {
          app: "Agunnaya Labs Studio",
          timestamp: Date.now(),
          exportedBy: firebaseUser?.email || "anonymous",
          version: "2.0"
        },
        tokens: AgunnayaDatabase.getTokens(),
        nfts: AgunnayaDatabase.getNFTs(),
        daos: AgunnayaDatabase.getDAOs(),
        gamefi: AgunnayaDatabase.getGameFi(),
        agents: AgunnayaDatabase.getAgents(),
        staking: AgunnayaDatabase.getStaking(),
        wallet: AgunnayaDatabase.getWallet(),
        activities: AgunnayaDatabase.getActivities()
      };

      await GoogleDriveService.createJsonFile(driveAccessToken, sanitizedName, payload);
      
      addTerminalLog("success", `GOOGLE_DRIVE: Workspace successfully backup up to Drive as [${sanitizedName}].`);
      showToast("Workspace successfully backed up to Google Drive!", "success");
      
      // Refresh list
      fetchBackups();
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `DRIVE_ERROR: Backup failed. ${error instanceof Error ? error.message : String(error)}`);
      showToast("Backup failed. Check network or permissions.", "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (file: GoogleDriveFile) => {
    if (!driveAccessToken) return;

    // MANDATORY confirmation dialog for data updating/writing
    const confirmed = window.confirm(
      `CONFIRM RESTORE:\nAre you sure you want to restore the backup "${file.name}"?\n\nThis will overwrite your current workspace components (Tokens, NFTs, DAOs, AI Agents, etc.) with the cloud records.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    addTerminalLog("info", `GOOGLE_DRIVE: Downloading and parsing cloud backup [${file.name}]...`);

    try {
      const data = await GoogleDriveService.getFileContent(driveAccessToken, file.id);
      
      if (!data || (typeof data !== "object")) {
        throw new Error("Invalid backup content. File must be a valid JSON payload.");
      }

      // Validations and restoring to Local Database
      let count = 0;
      if (Array.isArray(data.tokens)) {
        AgunnayaDatabase.saveTokens(data.tokens);
        count += data.tokens.length;
      }
      if (Array.isArray(data.nfts)) {
        AgunnayaDatabase.saveNFTs(data.nfts);
        count += data.nfts.length;
      }
      if (Array.isArray(data.daos)) {
        AgunnayaDatabase.saveDAOs(data.daos);
        count += data.daos.length;
      }
      if (Array.isArray(data.gamefi)) {
        AgunnayaDatabase.saveGameFi(data.gamefi);
        count += data.gamefi.length;
      }
      if (Array.isArray(data.agents)) {
        AgunnayaDatabase.saveAgents(data.agents);
        count += data.agents.length;
      }
      if (Array.isArray(data.activities)) {
        AgunnayaDatabase.saveActivities(data.activities);
      }
      if (data.wallet) {
        AgunnayaDatabase.saveWallet(data.wallet);
      }

      addTerminalLog("success", `GOOGLE_DRIVE: Restore completed. Loaded ${count} components into memory.`);
      showToast("Workspace restored successfully from Google Drive!", "success");
      
      // Refresh all state in UI
      onRefreshAllData();
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `DRIVE_ERROR: Restore failed. ${error instanceof Error ? error.message : String(error)}`);
      showToast("Restore failed. Invalid backup file format.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = async (file: GoogleDriveFile) => {
    if (!driveAccessToken) return;

    // MANDATORY confirmation dialog for data deleting
    const confirmed = window.confirm(
      `DELETE BACKUP:\nAre you sure you want to delete "${file.name}" from your Google Drive?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    addTerminalLog("info", `GOOGLE_DRIVE: Requesting deletion of file ID [${file.id}]...`);

    try {
      await GoogleDriveService.deleteFile(driveAccessToken, file.id);
      addTerminalLog("success", `GOOGLE_DRIVE: Deleted [${file.name}] successfully.`);
      showToast("Backup deleted successfully.", "success");
      fetchBackups();
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `DRIVE_ERROR: Deletion failed. ${error instanceof Error ? error.message : String(error)}`);
      showToast("Failed to delete backup.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDevData = async () => {
    if (!driveAccessToken) return;
    setIsExporting(true);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename = `agunnaya_dev_${exportType}_${timestamp}.json`;
    let content: any = null;

    if (exportType === "agents") {
      content = AgunnayaDatabase.getAgents();
    } else if (exportType === "tokens") {
      content = AgunnayaDatabase.getTokens();
    } else if (exportType === "daos") {
      content = AgunnayaDatabase.getDAOs();
    }

    addTerminalLog("info", `GOOGLE_DRIVE: Packaging standalone developer assets [${filename}]...`);

    try {
      await GoogleDriveService.createJsonFile(driveAccessToken, filename, {
        exportType,
        exportedAt: new Date().toISOString(),
        payload: content
      });
      
      addTerminalLog("success", `GOOGLE_DRIVE: Developer file [${filename}] successfully exported to Google Drive.`);
      showToast(`${exportType.toUpperCase()} schema exported to Drive!`, "success");
    } catch (error) {
      console.error(error);
      addTerminalLog("error", `DRIVE_ERROR: Export failed. ${error instanceof Error ? error.message : String(error)}`);
      showToast("Developer export failed.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="google-drive-view" className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white flex items-center gap-3">
            <Cloud className="w-8 h-8 text-blue-500 animate-pulse" />
            <span>Google Drive Workspace Backup</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-2 max-w-2xl">
            Securely persist your custom tokens, active AI agents, game settings, and governance DAOs in your personal Google Drive cloud storage. Reconnect and restore your workspace setup from any device instantly.
          </p>
        </div>
        
        {driveAccessToken && (
          <button
            onClick={fetchBackups}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-xs font-mono text-zinc-300 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Drive State</span>
          </button>
        )}
      </div>

      {/* Connection & Auth Guard */}
      {!driveAccessToken ? (
        <div className="bg-gradient-to-b from-zinc-950 to-black border border-white/10 rounded-2xl p-10 text-center max-w-xl mx-auto space-y-6 shadow-xl shadow-black/50">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto text-blue-400 border border-blue-500/20">
            <CloudOff className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-display">Authorize Google Drive Storage</h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              To browse cloud files, create snapshots of your workspace, and enable cross-device synchronization, please authenticate your Google account with Drive permissions.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            {/* Native styled Sign-in with Google button */}
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
              <span>Connect Google Drive</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono">
            Requires permissions: drive.file, drive.metadata.readonly
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Cloud Actions & Stats */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Active User Card */}
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              {firebaseUser?.photoURL ? (
                <ImageWithFallback 
                  src={firebaseUser.photoURL} 
                  alt={firebaseUser.displayName || "Google User"} 
                  fallbackText={firebaseUser.displayName}
                  className="w-12 h-12 rounded-full border border-white/15"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg text-white">
                  G
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cloud Drive Active
                </span>
                <h3 className="text-sm font-bold text-white truncate mt-0.5">
                  {firebaseUser?.displayName || "Google Drive Account"}
                </h3>
                <p className="text-[11px] text-zinc-500 truncate font-mono">
                  {firebaseUser?.email || "Connected via Google Auth"}
                </p>
              </div>
            </div>

            {/* Create Backup Box */}
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 text-white">
                <Database className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold font-display">Create Snapshot</h3>
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase">Backup File Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                    placeholder="Enter backup identifier"
                    className="w-full bg-black border border-white/10 focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none placeholder-zinc-600"
                  />
                  <span className="absolute right-3.5 top-3 text-[10px] font-mono text-zinc-600">.json</span>
                </div>
              </div>

              <div className="bg-zinc-950 border border-white/5 rounded-xl p-3 space-y-2">
                <span className="block text-[10px] font-mono text-zinc-500 uppercase">Snapshot Inventory</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-yellow-500/80" />
                    <span>{AgunnayaDatabase.getTokens().length} Tokens</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-purple-500/80" />
                    <span>{AgunnayaDatabase.getAgents().length} AI Agents</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98] disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isBackingUp ? "Uploading State..." : "Backup Current Workspace"}</span>
              </button>
            </div>

            {/* Developer Assets Export Panel */}
            <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-white">
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-display">Export Schema Configs</h3>
              </div>
              
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Save isolated modular schemas directly into Drive for version control or importing into custom external builders.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {(["agents", "tokens", "daos"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setExportType(type)}
                    className={`py-2 px-1 text-center font-mono text-[10px] border rounded-lg transition-all capitalize ${
                      exportType === type
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold"
                        : "bg-black border-white/15 text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportDevData}
                disabled={isExporting}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/15 text-white font-mono text-[11px] rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <FileJson className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isExporting ? "Exporting..." : `Save Deployed ${exportType.toUpperCase()} Config`}</span>
              </button>
            </div>

          </div>

          {/* Right Column: List of Backups / Restore Center */}
          <div className="lg:col-span-7">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold font-display text-white">Cloud Backups Manager</h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{backups.length} Saved Snapshots</span>
                </div>

                {isLoading ? (
                  <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="text-xs font-mono text-zinc-500">Querying Google Drive database...</span>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-300">No snapshots found</span>
                      <p className="text-[11px] text-zinc-500 max-w-xs mx-auto mt-1">
                        We couldn't detect any prior workspace snapshots in your Drive. Create a snapshot using the creator panel on the left.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {backups.map((file) => {
                      const createdDate = file.createdTime 
                        ? new Date(file.createdTime).toLocaleString()
                        : "Unknown Date";
                      const sizeKb = file.size 
                        ? `${(parseInt(file.size) / 1024).toFixed(1)} KB`
                        : "0 KB";

                      return (
                        <div
                          key={file.id}
                          className="bg-black hover:bg-zinc-900 border border-white/5 hover:border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/5 group-hover:bg-blue-500/10 flex items-center justify-center text-blue-400 border border-white/5 transition-all">
                              <FileJson className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate font-mono">
                                {file.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-500">
                                <span>{createdDate}</span>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                <span>{sizeKb}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleRestoreBackup(file)}
                              title="Restore entire workspace from this backup"
                              className="p-2 rounded-lg bg-zinc-900 hover:bg-blue-500/10 text-zinc-400 hover:text-blue-400 border border-white/5 hover:border-blue-500/20 transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(file)}
                              title="Delete snapshot from Google Drive"
                              className="p-2 rounded-lg bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Warning Notice */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 mt-6">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-400/90 leading-relaxed">
                  <strong className="block font-bold text-white mb-0.5">Important Safety Notice:</strong>
                  Restoring a snapshot replaces all existing smart contract data and custom agent definitions currently active in your local browser sandbox. Make sure to back up any uncommitted work first.
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
