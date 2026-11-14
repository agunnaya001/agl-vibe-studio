import type { Express, Request, Response } from "express";

const disabled = (_req: Request, res: Response) => {
  return res.status(501).json({
    success: false,
    code: "AUTONOMOUS_EXECUTION_NOT_CONFIGURED",
    error: "Autonomous execution is paused until secure wallet custody, explicit approval, verified strategy adapters, and confirmed Base receipts are implemented. No wallet was created and no transaction was submitted."
  });
};

export function registerAutonomousAgentRoutes(app: Express) {
  app.post("/api/ai/autonomous-agents/create-wallet", disabled);
  app.post("/api/ai/autonomous-agents/execute-market-making", disabled);
  app.post("/api/ai/autonomous-agents/execute-arbitrage", disabled);
  app.post("/api/ai/autonomous-agents/execute-governance", disabled);
  app.post("/api/ai/autonomous-agents/run-cycle", disabled);
}
