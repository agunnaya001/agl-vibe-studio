import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";

const plugins: any[] = [];
if (
  process.env.BETTER_AUTH_API_KEY &&
  process.env.BETTER_AUTH_API_KEY !== "MY_BETTER_AUTH_API_KEY" &&
  process.env.BETTER_AUTH_API_KEY.trim() !== ""
) {
  try {
    plugins.push(dash({ apiKey: process.env.BETTER_AUTH_API_KEY.trim() }));
  } catch (e) {
    console.warn("[Better Auth] Dash plugin init skipped:", e);
  }
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL || "http://0.0.0.0:3000",
  secret: process.env.BETTER_AUTH_SECRET || "agunnaya-labs-studio-better-auth-secret-key-2026",
  plugins,
});


