import fs from "fs";
import path from "path";
import solc from "solc";

function findImports(importPath: string) {
  try {
    let resolvedPath = importPath;
    if (importPath.startsWith("@openzeppelin/")) {
      resolvedPath = path.resolve(process.cwd(), "node_modules", importPath);
    } else if (importPath.startsWith("./") || importPath.startsWith("../")) {
      resolvedPath = path.resolve(process.cwd(), "contracts", importPath);
    }

    if (fs.existsSync(resolvedPath)) {
      return { contents: fs.readFileSync(resolvedPath, "utf8") };
    }
    return { error: `File not found: ${importPath} (resolved: ${resolvedPath})` };
  } catch (err: any) {
    return { error: err.message };
  }
}

export function compileAllContracts() {
  console.log("Compiling contracts with Solidity v0.8.20 (optimizer: 200 runs, evmVersion: paris)...");

  const sources: Record<string, { content: string }> = {};

  // Contract sources
  const contractFiles = [
    { name: "contracts/AGLVotesWrapper.sol", file: "./contracts/AGLVotesWrapper.sol" },
    { name: "contracts/AgunnayaDAO.sol", file: "./contracts/AgunnayaDAO.sol" },
    { name: "@openzeppelin/contracts/governance/TimelockController.sol", file: "./node_modules/@openzeppelin/contracts/governance/TimelockController.sol" },
  ];

  for (const c of contractFiles) {
    const fullPath = path.resolve(process.cwd(), c.file);
    if (fs.existsSync(fullPath)) {
      sources[c.name] = { content: fs.readFileSync(fullPath, "utf8") };
    } else {
      throw new Error(`File not found: ${fullPath}`);
    }
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  if (output.errors) {
    let hasFatal = false;
    for (const error of output.errors) {
      if (error.severity === "error") {
        console.error("COMPILE ERROR:", error.formattedMessage);
        hasFatal = true;
      } else {
        console.warn("COMPILE WARNING:", error.formattedMessage);
      }
    }
    if (hasFatal) {
      throw new Error("Solidity compilation failed with errors.");
    }
  }

  const artifactsDir = path.resolve(process.cwd(), "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const compiled: Record<string, { abi: any; bytecode: string }> = {};

  // Extract AGLVotesWrapper
  if (output.contracts["contracts/AGLVotesWrapper.sol"]?.["AGLVotesWrapper"]) {
    const data = output.contracts["contracts/AGLVotesWrapper.sol"]["AGLVotesWrapper"];
    compiled["AGLVotesWrapper"] = {
      abi: data.abi,
      bytecode: data.evm.bytecode.object,
    };
  }

  // Extract AgunnayaDAO
  if (output.contracts["contracts/AgunnayaDAO.sol"]?.["AgunnayaDAO"]) {
    const data = output.contracts["contracts/AgunnayaDAO.sol"]["AgunnayaDAO"];
    compiled["AgunnayaDAO"] = {
      abi: data.abi,
      bytecode: data.evm.bytecode.object,
    };
  }

  // Extract TimelockController
  if (output.contracts["@openzeppelin/contracts/governance/TimelockController.sol"]?.["TimelockController"]) {
    const data = output.contracts["@openzeppelin/contracts/governance/TimelockController.sol"]["TimelockController"];
    compiled["TimelockController"] = {
      abi: data.abi,
      bytecode: data.evm.bytecode.object,
    };
  }

  for (const [name, art] of Object.entries(compiled)) {
    fs.writeFileSync(path.join(artifactsDir, `${name}.json`), JSON.stringify(art, null, 2));
    console.log(`Saved artifact: artifacts/${name}.json (bytecode: ${art.bytecode.length / 2} bytes)`);
  }

  console.log("Solidity compilation completed successfully.");
  return { compiled, input, output };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  compileAllContracts();
}
