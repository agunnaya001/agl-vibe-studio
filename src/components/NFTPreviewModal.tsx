import React, { useState } from "react";
import { NFTCollection, NFTItem } from "../types";
import ImageWithFallback from "./ImageWithFallback";
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  Code, 
  Share2, 
  Layers, 
  Tag, 
  Database,
  Cpu
} from "lucide-react";

interface NFTPreviewModalProps {
  collection: NFTCollection;
  item?: NFTItem | null;
  onClose: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function NFTPreviewModal({
  collection,
  item,
  onClose,
  showToast
}: NFTPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"card" | "traits" | "metadata" | "contract">("card");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const displayTitle = item ? item.name : collection.name;
  const displayImage = item ? item.imageUrl : collection.imageUrl;
  const displayDesc = item ? item.description : collection.description;
  const traits = item?.traits || [
    { trait_type: "Access Tier", value: "Genesis Key" },
    { trait_type: "Network", value: "Base L2 Mainnet" },
    { trait_type: "Standard", value: "ERC-721A" },
    { trait_type: "Royalty", value: `${collection.royaltyFee}% EIP-2981` }
  ];

  const metadataJson = JSON.stringify(
    {
      name: displayTitle,
      description: displayDesc,
      image: displayImage,
      external_url: `https://basescan.org/address/${collection.contractAddress}`,
      attributes: traits,
      compiler: "Agunnaya Labs AI Studio v3.0",
      royalties: {
        seller_fee_basis_points: Math.round(collection.royaltyFee * 100),
        fee_recipient: collection.creator
      }
    },
    null,
    2
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({ x: -(y / rect.height) * 15, y: (x / rect.width) * 15 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    showToast(`Copied ${label} to clipboard!`, "success");
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-purple" />
            <h3 className="text-sm font-bold text-white font-display">
              NFT Interactive Inspector: <span className="text-brand-purple">{displayTitle}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-zinc-900/20 px-6">
          <button
            onClick={() => setActiveTab("card")}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "card"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Eye className="w-4 h-4" /> 3D Preview Card
          </button>
          <button
            onClick={() => setActiveTab("traits")}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "traits"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Tag className="w-4 h-4" /> Rarity Traits ({traits.length})
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "metadata"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Code className="w-4 h-4" /> IPFS JSON Metadata
          </button>
          <button
            onClick={() => setActiveTab("contract")}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "contract"
                ? "border-brand-purple text-brand-purple"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Base Contract Specs
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Interactive 3D Card */}
              <div
                className="perspective-1000 flex justify-center items-center py-4 cursor-grab"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  className="relative w-64 h-80 rounded-2xl p-4 bg-gradient-to-b from-zinc-900 to-black border border-white/20 shadow-2xl transition-transform duration-150 ease-out flex flex-col justify-between overflow-hidden"
                  style={{
                    transform: isHovered
                      ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.03)`
                      : "rotateX(0deg) rotateY(0deg) scale(1)",
                    transformStyle: "preserve-3d"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-purple/20 via-transparent to-purple-500/10 pointer-events-none" />
                  
                  <div className="relative z-10 aspect-square w-full rounded-xl overflow-hidden border border-white/10 shadow-inner">
                    <ImageWithFallback
                      src={displayImage}
                      alt={displayTitle}
                      fallbackText={collection.symbol}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="relative z-10 mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-brand-purple font-bold uppercase tracking-wider">
                        {collection.symbol} #{item ? item.id : "GENESIS"}
                      </span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                        VERIFIED
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white font-display truncate">
                      {displayTitle}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Specs side */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs uppercase font-mono text-zinc-500 font-bold tracking-wider">Collection Brief</h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{displayDesc}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-zinc-900/50 p-3 rounded-xl border border-white/5 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Mint Price</span>
                    <span className="text-white font-bold">{collection.mintPrice} ETH</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Supply</span>
                    <span className="text-white font-bold">{collection.currentSupply} / {collection.maxSupply}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Creator Royalty</span>
                    <span className="text-brand-purple font-bold">{collection.royaltyFee}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Network</span>
                    <span className="text-emerald-400 font-bold">Base Mainnet</span>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://basescan.org/address/${collection.contractAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-purple hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View on BaseScan Explorer
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === "traits" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Rarity & On-Chain Attributes
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {traits.map((t, idx) => (
                  <div key={idx} className="bg-zinc-900/70 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-mono text-brand-purple font-bold tracking-wider">
                      {t.trait_type}
                    </span>
                    <span className="text-xs font-bold text-white mt-1">
                      {t.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  EIP-721 Metadata Schema Payload
                </h4>
                <button
                  onClick={() => copyToClipboard(metadataJson, "JSON Metadata")}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg flex items-center gap-1 transition-all"
                >
                  {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAddress ? "Copied" : "Copy JSON"}</span>
                </button>
              </div>
              <pre className="p-4 bg-zinc-950 border border-white/10 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-60">
                {metadataJson}
              </pre>
            </div>
          )}

          {activeTab === "contract" && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Contract Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{collection.contractAddress}</span>
                    <button
                      onClick={() => copyToClipboard(collection.contractAddress, "Contract Address")}
                      className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Creator / Owner:</span>
                  <span className="text-zinc-200">{collection.creator}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Standard:</span>
                  <span className="text-brand-purple font-bold">ERC-721A (Azuki Gas Optimized)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Royalty Standard:</span>
                  <span className="text-emerald-400 font-bold">EIP-2981 (On-chain Enforcement)</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
