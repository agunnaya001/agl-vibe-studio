import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";

const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
if (!authSecret || authSecret === "MY_BETTER_AUTH_SECRET" || authSecret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must be configured with a unique random value of at least 32 characters."
  );
}

const configuredBaseURL =
  process.env.BETTER_AUTH_URL?.trim() || process.env.APP_URL?.trim();
const baseURL =
  configuredBaseURL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined);

if (!baseURL || baseURL === "MY_APP_URL") {
  throw new Error(
    "Set BETTER_AUTH_URL (or APP_URL) to the public application origin before starting the server."
  );
}

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
  baseURL,
  secret: authSecret,
  plugins,
});
