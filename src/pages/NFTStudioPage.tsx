import React, { useState } from "react";
import { NFTCollection, WalletState, NFTItem } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import IPFSUploader from "../components/IPFSUploader";
import ImageWithFallback from "../components/ImageWithFallback";
import NFTPreviewModal from "../components/NFTPreviewModal";
import { Disc, Image, Sparkles, CheckCircle, Tag, Settings, Users, Plus, ShieldCheck, Eye } from "lucide-react";

interface NFTStudioPageProps {
  wallet: WalletState;
  collections: NFTCollection[];
  onRefreshNFTs: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function NFTStudioPage({ wallet, collections, onRefreshNFTs, addTerminalLog, showToast }: NFTStudioPageProps) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [mintPrice, setMintPrice] = useState("0.01");
  const [maxSupply, setMaxSupply] = useState("500");
  const [royaltyFee, setRoyaltyFee] = useState("5");
  const [bannerUrl, setBannerUrl] = useState("");
  const [creating, setCreating] = useState(false);

  // Preview State
  const [previewCollection, setPreviewCollection] = useState<NFTCollection | null>(null);

  // Mint state
  const [mintingCollection, setMintingCollection] = useState<string | null>(null);

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    if (!name || !symbol || !description) return;
    setCreating(true);

    addTerminalLog("info", `Deploying audited ERC-721 collection contract: ${name}...`);

    setTimeout(() => {
      const generatedAddress = "0x" + Math.random().toString(16).substr(2, 40);
      const mockBanner = bannerUrl.trim() || "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80";

      const newColl: NFTCollection = {
        contractAddress: generatedAddress,
        name,
        symbol: symbol.toUpperCase(),
        description,
        creator: wallet.address,
        mintPrice: parseFloat(mintPrice) || 0.01,
        currentSupply: 0,
        maxSupply: parseInt(maxSupply) || 500,
        royaltyFee: parseFloat(royaltyFee) || 5,
        isRevealed: true,
        isVerified: false,
        imageUrl: mockBanner,
        items: [],
        socials: {},
        createdAt: Date.now()
      };

      const current = AgunnayaDatabase.getNFTs();
      current.push(newColl);
      AgunnayaDatabase.saveNFTs(current);

      // Charge gas
      const updatedWallet = { ...wallet, balanceEth: Math.max(0, wallet.balanceEth - 0.005) };
      AgunnayaDatabase.saveWallet(updatedWallet);
      onRefreshNFTs();

      AgunnayaDatabase.addActivity({
        type: "create",
        tokenSymbol: newColl.symbol,
        tokenAddress: newColl.contractAddress,
        user: wallet.address,
        amount: 0,
        ethValue: 0.005,
        details: `Created custom NFT collection: ${newColl.name} (${newColl.symbol})`
      });

      addTerminalLog("success", `ERC-721 contract deployed at ${newColl.contractAddress}`);
      setCreating(false);
      setName("");
      setSymbol("");
      setDescription("");
      setBannerUrl("");
    }, 2000);
  };

  const handleMintNFT = (collectionAddress: string) => {
    if (!wallet.isConnected) {
      showToast("Connect wallet first.", "error");
      return;
    }
    setMintingCollection(collectionAddress);

    setTimeout(() => {
      const all = AgunnayaDatabase.getNFTs();
      const coll = all.find(c => c.contractAddress === collectionAddress);
      
      if (coll) {
        if (coll.currentSupply >= coll.maxSupply) {
          showToast("Collection sold out!", "error");
          setMintingCollection(null);
          return;
        }

        if (wallet.balanceEth < coll.mintPrice) {
          showToast("Insufficient ETH balance.", "error");
          setMintingCollection(null);
          return;
        }

        const nextId = coll.items.length + 1;
        const newItem: NFTItem = {
          id: nextId,
          name: `${coll.name} #${nextId}`,
          description: `A unique metadata item forged inside ${coll.name}.`,
          imageUrl: coll.imageUrl,
          traits: [
            { trait_type: "Edition", value: `#${nextId}` },
            { trait_type: "Background", value: "Agunnaya Cyber Purple" },
            { trait_type: "Rarity", value: "Genesis Common" }
          ]
        };

        coll.items.push(newItem);
        coll.currentSupply += 1;
        AgunnayaDatabase.saveNFTs(all);

        // Deduct ETH
        const updatedWallet = { ...wallet, balanceEth: wallet.balanceEth - coll.mintPrice };
        AgunnayaDatabase.saveWallet(updatedWallet);
        onRefreshNFTs();

        AgunnayaDatabase.addActivity({
          type: "mint",
          tokenSymbol: coll.symbol,
          tokenAddress: coll.contractAddress,
          user: wallet.address,
          amount: 1,
          ethValue: coll.mintPrice,
          details: `Minted ${coll.name} #${nextId} NFT into portfolio`
        });

        addTerminalLog("success", `Minted NFT successfully! Serial ID: #${nextId}`);
      }
      setMintingCollection(null);
    }, 1500);
  };

  return (
    <div id="nft-studio-root" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      
      {/* Create form panel */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
          <div>
            <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Disc className="w-5 h-5 text-brand-purple" />
              NFT Collection Creator
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Deploy fully compliant, gas-optimized ERC-721 token collection contracts on Base. Supports royalties, lazy mint parameters, and custom whitelists.
            </p>
          </div>

          <form onSubmit={handleCreateCollection} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Collection Name</label>
                <input
                  id="nft-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Base Cyber Monkeys"
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Ticker Symbol</label>
                <input
                  id="nft-symbol-input"
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. BCM"
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white uppercase focus:outline-none focus:border-brand-purple/40 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Collection Description</label>
              <textarea
                id="nft-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Give collectors a detailed brief on your roadmap, art assets, or project utilities..."
                required
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Mint Price (ETH)</label>
                <input
                  id="nft-price-input"
                  type="number"
                  step="0.001"
                  value={mintPrice}
                  onChange={(e) => setMintPrice(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Max Supply</label>
                <input
                  id="nft-maxsupply-input"
                  type="number"
                  value={maxSupply}
                  onChange={(e) => setMaxSupply(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Royalty Fee (%)</label>
                <input
                  id="nft-royalty-input"
                  type="number"
                  min={0}
                  max={25}
                  value={royaltyFee}
                  onChange={(e) => setRoyaltyFee(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <IPFSUploader
                onUploadSuccess={(url) => setBannerUrl(url)}
                showToast={showToast}
                addTerminalLog={addTerminalLog}
                label="Collection Artwork (Pinned to IPFS)"
                placeholderUrl={bannerUrl}
              />
            </div>

            <button
              id="nft-create-submit-btn"
              type="submit"
              disabled={creating}
              className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 font-semibold font-display text-xs text-white shadow-lg shadow-brand-purple/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all flex items-center justify-center gap-2"
            >
              <Disc className="w-4 h-4" />
              <span>{creating ? "Deploying NFT Contract..." : "Deploy NFT Collection to Base"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Deployed collections dashboard preview */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold font-display uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-brand-purple" /> Deployed NFT Assets
        </h3>

        {collections.length === 0 ? (
          <div className="text-center py-24 bg-zinc-950/20 border border-dashed border-white/5 rounded-2xl">
            <Image className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">No collections deployed.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {collections.map((coll) => (
              <div key={coll.contractAddress} className="glass-panel rounded-2xl border border-white/5 p-4 bg-zinc-900/10 space-y-4">
                <div className="flex gap-3">
                  <ImageWithFallback src={coll.imageUrl} alt={coll.name} fallbackText={coll.symbol} className="w-12 h-12 rounded-xl object-cover border border-white/5 shrink-0" />
                  <div>
                    <h4 className="font-display font-bold text-white text-xs">{coll.name}</h4>
                    <span className="block text-[10px] font-mono text-brand-purple font-bold uppercase">{coll.symbol} Collection</span>
                    <span className="block text-[8px] font-mono text-zinc-500 truncate max-w-[150px]">Address: {coll.contractAddress}</span>
                  </div>
                </div>

                <p className="text-zinc-400 text-[10px] leading-normal line-clamp-2">
                  {coll.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-b border-white/5 py-2.5">
                  <div>
                    <span className="block text-[8px] text-zinc-500">Mint Price:</span>
                    <span className="text-white font-bold">{coll.mintPrice} ETH</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] text-zinc-500">Total Minted:</span>
                    <span className="text-zinc-200 font-bold">{coll.currentSupply} / {coll.maxSupply}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id={`preview-nft-action-${coll.contractAddress}`}
                    onClick={() => setPreviewCollection(coll)}
                    className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 text-[10px] font-bold font-mono rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-brand-purple" />
                    <span>3D Inspector</span>
                  </button>

                  <button
                    id={`mint-nft-action-${coll.contractAddress}`}
                    onClick={() => handleMintNFT(coll.contractAddress)}
                    disabled={mintingCollection === coll.contractAddress}
                    className="py-2 bg-brand-purple/20 hover:bg-brand-purple text-brand-purple hover:text-white border border-brand-purple/30 text-[10px] font-bold font-mono rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{mintingCollection === coll.contractAddress ? "Minting..." : "Mint Item"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Render 3D Preview Inspector Modal */}
      {previewCollection && (
        <NFTPreviewModal
          collection={previewCollection}
          onClose={() => setPreviewCollection(null)}
          showToast={showToast}
        />
      )}

    </div>
  );
}
