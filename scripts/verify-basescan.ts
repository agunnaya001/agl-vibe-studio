import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "";

function resolveImportPath(importPath: string, parentPath: string): string {
  if (importPath.startsWith("@openzeppelin/")) {
    return importPath;
  }
  if (importPath.startsWith(".")) {
    const parentDir = path.dirname(parentPath);
    return path.normalize(path.join(parentDir, importPath));
  }
  return importPath;
}

function loadContent(filePath: string): string {
  let resolved = "";
  if (filePath.startsWith("contracts/")) {
    resolved = path.resolve(process.cwd(), filePath);
  } else if (filePath.startsWith("@openzeppelin/")) {
    resolved = path.resolve(process.cwd(), "node_modules", filePath);
  } else {
    resolved = path.resolve(process.cwd(), filePath);
  }

  if (fs.existsSync(resolved)) {
    return fs.readFileSync(resolved, "utf8");
  }
  throw new Error(`Cannot resolve import file: ${filePath} (resolved to: ${resolved})`);
}

function collectAllSources(entryFile: string) {
  const sources: Record<string, { content: string }> = {};
  const queue: string[] = [entryFile];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);

    const content = loadContent(current);
    sources[current] = { content };

    // Find imports inside content
    const importRegex = /import\s+["']([^"']+)["'];|import\s+[^'"]*from\s+["']([^"']+)["'];/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const rawImp = match[1] || match[2];
      const resolvedImp = resolveImportPath(rawImp, current);
      if (!seen.has(resolvedImp)) {
        queue.push(resolvedImp);
      }
    }
  }

  return sources;
}

export async function verifyContractStandardJson(
  contractAddress: string,
  contractEntryPath: string,
  contractName: string,
  constructorArgsHex: string = ""
) {
  console.log(`\n=============================================================`);
  console.log(`Submitting Standard-JSON Verification for ${contractName} (${contractAddress})...`);

  if (!BASESCAN_API_KEY) {
    console.log("No BASESCAN_API_KEY provided in .env");
    return;
  }

  const entryPath = contractEntryPath.endsWith(".sol")
    ? contractEntryPath
    : `contracts/${contractEntryPath}.sol`;
  const sources = collectAllSources(entryPath);
  console.log(`Collected ${Object.keys(sources).length} Solidity source files for compilation.`);

  const standardJsonInput = {
    language: "Solidity",
    sources: sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "paris",
      outputSelection: {
        "*": {
          "*": ["*"]
        }
      }
    }
  };

  const cleanArgs = constructorArgsHex.startsWith("0x") ? constructorArgsHex.slice(2) : constructorArgsHex;
  const fullContractPath = `${entryPath}:${contractName}`;

  const payload = new URLSearchParams({
    apikey: BASESCAN_API_KEY,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: contractAddress,
    sourceCode: JSON.stringify(standardJsonInput),
    codeformat: "solidity-standard-json-input",
    contractname: fullContractPath,
    compilerversion: "v0.8.20+commit.a1b79de6",
    constructorArguements: cleanArgs,
    licenseType: "3"
  });

  const url = `https://api.etherscan.io/v2/api?chainid=8453`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString()
    });
    const data = await res.json();
    console.log("Basescan Submission Response:", data);

    if (data.status === "1" && data.result) {
      const guid = data.result;
      console.log(`Polling verification for GUID: ${guid}...`);
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 6000));
        const statusRes = await fetch(
          `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=checkverifystatus&guid=${guid}&apikey=${BASESCAN_API_KEY}`
        );
        const statusData = await statusRes.json();
        console.log(`Status (${i + 1}/8):`, statusData.result || statusData.message);
        if (
          statusData.status === "1" ||
          statusData.result?.toLowerCase().includes("success") ||
          statusData.result?.toLowerCase().includes("already verified")
        ) {
          console.log(`>>> ${contractName} is OFFICIALLY VERIFIED ON BASESCAN!`);
          break;
        }
      }
    }
  } catch (err: any) {
    console.warn("Basescan verification error:", err.message);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const contractAddress = args[0] || "0xA27C9BA04D06EcAF766EF4e074b403DAf19A3d69";
  const contractName = args[1] || "AGLVotesWrapper";
  const constructorArgs = args[2] || "000000000000000000000000ea1221b4d80a89bd8c75248fae7c176bd1854698";

  await verifyContractStandardJson(contractAddress, contractName, contractName, constructorArgs);
}

if (process.argv[1]?.includes("verify-basescan.ts")) {
  run();
}
