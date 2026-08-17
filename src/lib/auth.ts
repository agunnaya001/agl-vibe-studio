import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL || "https://aistudio.agunnayalabs.xyz",
  secret: process.env.BETTER_AUTH_SECRET || "agunnaya-labs-studio-better-auth-secret-key-2026",
  plugins: [
    dash()
  ]
});

