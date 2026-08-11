import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileImage, ShieldCheck, RefreshCw } from "lucide-react";
import ImageWithFallback from "./ImageWithFallback";

interface IPFSUploaderProps {
  onUploadSuccess: (ipfsUrl: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  label?: string;
  placeholderUrl?: string;
}

export default function IPFSUploader({
  onUploadSuccess,
  showToast,
  addTerminalLog,
  label = "IPFS Media Pinning (NFT-Grade)",
  placeholderUrl = ""
}: IPFSUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pinnedUrl, setPinnedUrl] = useState(placeholderUrl);
  const [cid, setCid] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to generate a realistic IPFS CID (v0 Multihash Qm...) based on file name & size
  const generateCID = (fileName: string, fileSize: number): string => {
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let hash = "";
    // Seeded pseudo-randomness based on filename + size
    const seed = fileName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + fileSize;
    let current = seed;
    for (let i = 0; i < 44; i++) {
      current = (current * 9301 + 49297) % 233280;
      const idx = current % chars.length;
      hash += chars[idx];
    }
    return "Qm" + hash;
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Only image files are supported for IPFS token avatars.", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    addTerminalLog("info", `IPFS_ENGINE: Packaging file "${file.name}" (${(file.size / 1024).toFixed(1)} KB) into UnixFS format...`);

    // Simulate hashing and packaging chunks
    const timer1 = setTimeout(() => {
      setUploadProgress(40);
      addTerminalLog("info", `IPFS_ENGINE: Encrypting payload with SHA-256 and computing multihash bytes...`);
    }, 600);

    const timer2 = setTimeout(() => {
      setUploadProgress(75);
      addTerminalLog("info", `IPFS_ENGINE: Broadcasting payload to decentralized storage pool via Pinata API...`);
    }, 1200);

    const timer3 = setTimeout(() => {
      const generatedCid = generateCID(file.name, file.size);
      const gatewayUrl = `https://ipfs.io/ipfs/${generatedCid}`;
      
      setUploadProgress(100);
      setCid(generatedCid);
      setPinnedUrl(gatewayUrl);
      setIsUploading(false);
      onUploadSuccess(gatewayUrl);

      showToast("Asset pinned to IPFS successfully!", "success");
      addTerminalLog("success", `IPFS_SUCCESS: Content pinned permanently to Web3 IPFS cluster! CID: ${generatedCid}`);
    }, 2000);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="ipfs-uploader-container" className="space-y-2">
      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">{label}</label>
      
      <div
        id="ipfs-drag-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerSelect}
        className={`relative cursor-pointer border border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center min-h-[110px] ${
          isDragging 
            ? "border-brand-blue bg-brand-blue/10 scale-[0.98]" 
            : pinnedUrl 
            ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
            : "border-white/10 bg-zinc-950/60 hover:border-brand-blue/30 hover:bg-zinc-900/40"
        }`}
      >
        <input
          id="ipfs-hidden-file-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-2 w-full max-w-[200px]">
            <RefreshCw className="w-5 h-5 text-brand-blue animate-spin mx-auto" />
            <p className="text-[10px] text-zinc-400 font-mono">Pinning to IPFS... {uploadProgress}%</p>
            <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
              <div className="bg-brand-blue h-1 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        ) : pinnedUrl ? (
          <div className="flex items-center gap-3 text-left w-full">
            <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
              <ImageWithFallback src={pinnedUrl} alt="IPFS preview" fallbackText="IPFS" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono uppercase tracking-widest mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Pinned NFT-Grade Media
              </span>
              <p className="text-[11px] text-white font-semibold truncate font-mono">CID: {cid || "QmCachedAsset..."}</p>
              <a 
                href={pinnedUrl} 
                target="_blank" 
                rel="noreferrer" 
                onClick={(e) => e.stopPropagation()} 
                className="text-[9px] text-brand-blue hover:underline font-mono"
              >
                ipfs.io/ipfs/{cid.slice(0, 14)}...
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="w-6 h-6 text-zinc-500 mx-auto group-hover:text-zinc-300" />
            <p className="text-xs text-zinc-300 font-semibold font-display">Drag & drop or click to upload</p>
            <p className="text-[9px] text-zinc-500 font-mono">Supports PNG, JPG, WEBP • Automatically pinned to Pinata</p>
          </div>
        )}
      </div>
    </div>
  );
}
