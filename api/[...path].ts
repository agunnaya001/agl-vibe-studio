import { app } from "../server";

// Vercel catch-all function for the existing Express API.
// Static frontend assets are served by Vercel's Vite output; this function handles /api/* only.
export default function handler(req: any, res: any) {
  return app(req, res);
}

export const config = {
  maxDuration: 60
};
