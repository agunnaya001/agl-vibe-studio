import React, { useState } from "react";
import { 
  Code2, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck, 
  ExternalLink, 
  Layers, 
  Bot, 
  Coins, 
  Database, 
  Play, 
  ArrowRight,
  BookOpen,
  Sparkles,
  Zap,
  Globe
} from "lucide-react";
import { AGL_TOKEN_ADDRESS, AGL_CREDITS_ADDRESS, TOKEN_FACTORY_ADDRESS, AGL_TREASURY_ADDRESS } from "../lib/aglContracts";

interface DeveloperSdkPageProps {
  onSelectTab: (tab: string) => void;
}

type SdkModule = 
  | "agents"
  | "security_audits"
  | "contract_analysis"
  | "deployments"
  | "credits"
  | "analytics"
  | "identity"
  | "marketplace";

interface ModuleSpec {
  id: SdkModule;
  title: string;
  description: string;
  icon: any;
  typescriptSnippet: string;
  curlSnippet: string;
  sampleResponse: string;
}

const MODULES: ModuleSpec[] = [
  {
    id: "agents",
    title: "Autonomous Agents API",
    description: "Trigger specialized AI agents, model governance proposals, and simulate market making.",
    icon: Bot,
    typescriptSnippet: `import { AgunnayaLabsSDK } from "@agunnaya/sdk";

const agl = new AgunnayaLabsSDK({ network: "base-mainnet" });

// Execute an AI Agent with cryptographic safety
const result = await agl.agents.execute({
  agentRole: "solidity_auditor",
  targetContract: "0x1234567890123456789012345678901234567890",
  tools: ["cei_check", "reentrancy_scan"]
});

console.log(result.report);`,
    curlSnippet: `curl -X POST https://api.aglstudio.xyz/v1/agents/execute \\
  -H "Authorization: Bearer AGL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentRole": "solidity_auditor",
    "targetContract": "0x1234567890123456789012345678901234567890",
    "tools": ["cei_check", "reentrancy_scan"]
  }'`,
    sampleResponse: `{
  "status": "success",
  "agentId": "solidity-auditor-v2",
  "auditScore": 96,
  "vulnerabilities": [],
  "gasOptimizationRating": "optimal",
  "creditsDeducted": 15
}`
  },
  {
    id: "security_audits",
    title: "Security Auditing Engine",
    description: "Automated Checks-Effects-Interactions (CEI) verification, AST vulnerability scanning, and diff generation.",
    icon: ShieldCheck,
    typescriptSnippet: `import { AgunnayaLabsSDK } from "@agunnaya/sdk";

const agl = new AgunnayaLabsSDK({ network: "base-mainnet" });

const audit = await agl.security.auditSourceCode({
  solidityCode: "contract MyToken { ... }",
  compilerVersion: "0.8.20",
  strictCei: true
});

if (!audit.passed) {
  console.error("Vulnerabilities detected:", audit.issues);
}`,
    curlSnippet: `curl -X POST https://api.aglstudio.xyz/v1/security/audit \\
  -H "Authorization: Bearer AGL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "solidityCode": "contract MyToken { ... }",
    "compilerVersion": "0.8.20",
    "strictCei": true
  }'`,
    sampleResponse: `{
  "passed": true,
  "ceiViolations": 0,
  "reentrancyScore": "SECURE",
  "arithmeticRisk": "NONE",
  "recommendations": []
}`
  },
  {
    id: "contract_analysis",
    title: "Contract Bytecode & ABI Analysis",
    description: "Extract function selectors, resolve EIP-1967 proxies, and decompile bytecode on Base Mainnet.",
    icon: Code2,
    typescriptSnippet: `import { AgunnayaLabsSDK } from "@agunnaya/sdk";

const agl = new AgunnayaLabsSDK({ network: "base-mainnet" });

// Inspect any live Base contract
const analysis = await agl.contracts.analyzeAddress("0xEA1221b4d80a89bd8c75248fae7c176bd1854698");
console.log("Is Proxy:", analysis.isProxy);
console.log("Selectors:", analysis.functionSelectors);`,
    curlSnippet: `curl -X GET https://api.aglstudio.xyz/v1/contracts/0xEA1221b4d80a89bd8c75248fae7c176bd1854698/analyze \\
  -H "Authorization: Bearer AGL_API_KEY"`,
    sampleResponse: `{
  "address": "0xEA1221b4d80a89bd8c75248fae7c176bd1854698",
  "isVerified": true,
  "name": "Agunnaya Labs Token",
  "symbol": "AGL",
  "isProxy": false,
  "storageSlots": {
    "0x0": "totalSupply",
    "0x1": "balances"
  }
}`
  },
  {
    id: "deployments",
    title: "Base Deployment & Pre-Flight",
    description: "Calculate Base L1 data blob posting fees, encode constructor parameters, and verify on BaseScan.",
    icon: Zap,
    typescriptSnippet: `import { AgunnayaLabsSDK } from "@agunnaya/sdk";

const agl = new AgunnayaLabsSDK({ network: "base-mainnet" });

// Pre-flight check before prompting wallet
const preflight = await agl.deployments.estimateDeploymentCost({
  bytecodeLength: 8420,
  constructorArgs: ["Agunnaya Token", "AGL", 1000000000]
});

console.log("Estimated L2 + Blob fee (ETH):", preflight.totalFeeEth);`,
    curlSnippet: `curl -X POST https://api.aglstudio.xyz/v1/deployments/preflight \\
  -H "Authorization: Bearer AGL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bytecodeLength": 8420,
    "constructorArgs": ["Agunnaya Token", "AGL", 1000000000]
  }'`,
    sampleResponse: `{
  "l2ExecutionFeeEth": "0.00012",
  "l1DataBlobFeeEth": "0.00004",
  "totalFeeEth": "0.00016",
  "isAffordable": true
}`
  },
  {
    id: "credits",
    title: "AGL Credits & Metering",
    description: "Programmatically inspect developer credits, query burn ratios, and authenticate studio usage.",
    icon: Coins,
    typescriptSnippet: `import { AgunnayaLabsSDK } from "@agunnaya/sdk";

const agl = new AgunnayaLabsSDK({ network: "base-mainnet" });

// Query credit balance for user wallet
const balance = await agl.credits.getBalance("0x725615639B760DAa64b3e794AA49B5A9a8A7632E");
console.log("Current Credits:", balance.credits);
console.log("Burn Exchange Ratio:", balance.creditsPerAgl);`,
    curlSnippet: `curl -X GET https://api.aglstudio.xyz/v1/credits/0x725615639B760DAa64b3e794AA49B5A9a8A7632E \\
  -H "Authorization: Bearer AGL_API_KEY"`,
    sampleResponse: `{
  "address": "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
  "credits": 500,
  "creditsPerAgl": 10,
  "contractAddress": "0x13866F31c60822Ff70684213b9727915Ddf2c183"
}`
  },
  {
    id: "identity",
    title: "Builder Identity & Badges",
    description: "Fetch verified on-chain builder credentials, deployment counts, and earned achievement badges.",
    icon: Globe,
    typescriptSnippet: `import { AgunnayaLabsSDK } from "@agunnaya/sdk";

const agl = new AgunnayaLabsSDK({ network: "base-mainnet" });

const profile = await agl.identity.getBuilderProfile("0x725615639B760DAa64b3e794AA49B5A9a8A7632E");
console.log("Verified Builder:", profile.isVerified);
console.log("Badges Earned:", profile.badges.map(b => b.title));`,
    curlSnippet: `curl -X GET https://api.aglstudio.xyz/v1/identity/0x725615639B760DAa64b3e794AA49B5A9a8A7632E \\
  -H "Authorization: Bearer AGL_API_KEY"`,
    sampleResponse: `{
  "walletAddress": "0x725615639B760DAa64b3e794AA49B5A9a8A7632E",
  "isVerified": true,
  "contractsDeployed": 5,
  "auditsPerformed": 8,
  "badges": ["Base Genesis Deployer", "Security Guardian"]
}`
  },
  {
    id: "marketplace",
    title: "Marketplace & Registry API",
    description: "Query discoverable AI agents, dApps, and smart contract templates programmatically.",
    icon: Layers,
    typescriptSnippet: `import { AgunnayaLabsSDK } from "@agunnaya/sdk";

const agl = new AgunnayaLabsSDK({ network: "base-mainnet" });

// Query marketplace items by category
const listings = await agl.marketplace.query({
  category: "ai_agents",
  network: "Base Mainnet",
  verifiedOnly: true
});

console.log("Available Agents:", listings.length);`,
    curlSnippet: `curl -X GET "https://api.aglstudio.xyz/v1/marketplace?category=ai_agents&network=base-mainnet" \\
  -H "Authorization: Bearer AGL_API_KEY"`,
    sampleResponse: `[
  {
    "id": "agl-solidity-auditor-agent",
    "name": "Agunnaya Solidity Auditor Pro",
    "version": "2.1.0",
    "creditsCost": 25,
    "creator": "0x725615639B760DAa64b3e794AA49B5A9a8A7632E"
  }
]`
  },
  {
    id: "analytics",
    title: "Base & Protocol Analytics",
    description: "Fetch live Base gas prices, blob throughput, liquidity reserves, and bonding curve states.",
    icon: Sparkles,
    typescriptSnippet: `import { AgunnayaLabsSDK } from "@agunnaya/sdk";

const agl = new AgunnayaLabsSDK({ network: "base-mainnet" });

const metrics = await agl.analytics.getEcosystemMetrics();
console.log("Total Projects:", metrics.studio.totalProjectsCount);
console.log("DAO Proposals:", metrics.governance.totalProposalsCount);`,
    curlSnippet: `curl -X GET https://api.aglstudio.xyz/v1/analytics/ecosystem \\
  -H "Authorization: Bearer AGL_API_KEY"`,
    sampleResponse: `{
  "timestamp": 1726484400000,
  "network": "Base Mainnet",
  "chainId": 8453,
  "aglTokenAddress": "0xEA1221b4d80a89bd8c75248fae7c176bd1854698",
  "registeredBuilders": 428,
  "creditsConsumed": 48950
}`
  }
];

export default function DeveloperSdkPage({ onSelectTab }: DeveloperSdkPageProps) {
  const [selectedModule, setSelectedModule] = useState<SdkModule>("agents");
  const [codeType, setCodeType] = useState<"ts" | "curl">("ts");
  const [copied, setCopied] = useState(false);

  const activeSpec = MODULES.find(m => m.id === selectedModule) || MODULES[0];

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950/20 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-mono font-medium">
              <Code2 className="w-3.5 h-3.5" />
              <span>Agunnaya Developer Infrastructure</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white">
              AGL Developer SDK & API Layer
            </h1>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              Integrate Agunnaya AI agents, automated security audits, contract analysis, and credit metering into your own applications with clean TypeScript and REST boundaries.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 font-mono text-xs">
            <div className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 flex items-center gap-2">
              <span className="text-zinc-500">npm i</span>
              <strong className="text-white">@agunnaya/sdk</strong>
              <button 
                onClick={() => handleCopyCode("npm i @agunnaya/sdk")}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Module Navigation on Left, Interactive API Documentation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Module Sidebar */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider px-1">
            SDK Core Modules
          </h3>
          <div className="space-y-1">
            {MODULES.map(mod => {
              const Icon = mod.icon;
              const isSelected = selectedModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-brand-purple text-white font-bold shadow-md shadow-brand-purple/20"
                      : "bg-zinc-900/40 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{mod.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Documentation & Code Samples */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/40 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  MODULE: {activeSpec.id.toUpperCase()}
                </span>
                <h2 className="text-lg font-bold font-display text-white mt-1">
                  {activeSpec.title}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {activeSpec.description}
                </p>
              </div>

              {/* Toggle TypeScript vs cURL */}
              <div className="flex items-center p-1 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono">
                <button
                  onClick={() => setCodeType("ts")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    codeType === "ts" ? "bg-brand-purple text-white font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  TypeScript
                </button>
                <button
                  onClick={() => setCodeType("curl")}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    codeType === "curl" ? "bg-brand-purple text-white font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  cURL REST
                </button>
              </div>
            </div>

            {/* Code Block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Code Example:</span>
                <button
                  onClick={() => handleCopyCode(codeType === "ts" ? activeSpec.typescriptSnippet : activeSpec.curlSnippet)}
                  className="text-brand-purple hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Code"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
                {codeType === "ts" ? activeSpec.typescriptSnippet : activeSpec.curlSnippet}
              </pre>
            </div>

            {/* Expected JSON Response */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-mono text-zinc-400 block">Sample Response Payload:</span>
              <pre className="p-4 rounded-xl bg-zinc-950/80 border border-emerald-500/20 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                {activeSpec.sampleResponse}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
