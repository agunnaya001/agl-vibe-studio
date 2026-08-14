import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";

/**
 * Server-side Better Auth configuration.
 *
 * SECURITY: The signing secret must come from the environment. There is
 * intentionally NO hardcoded fallback — a known/committed secret would let
 * anyone forge valid session tokens. If BETTER_AUTH_SECRET is missing we fail
 * fast at boot rather than starting with an insecure default.
 */
const authSecret = process.env.BETTER_AUTH_SECRET;

if (!authSecret || authSecret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set (or is too short). Set a strong, unique secret " +
      "(at least 32 characters, e.g. `openssl rand -base64 32`) in your environment before starting the server."
  );
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL || "https://aistudio.agunnayalabs.xyz",
  secret: authSecret,
  plugins: [
    dash()
  ]
});

