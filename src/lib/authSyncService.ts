import { User, getIdTokenResult, getIdToken } from "firebase/auth";

export type AuthHealthStatus = "healthy" | "nearing_expiration" | "expired" | "offline" | "unauthenticated";

export interface AuthHealthState {
  status: AuthHealthStatus;
  expiresInSeconds: number | null;
  expiresInMinutes: number | null;
  lastCheckedAt: number | null;
  errorMessage?: string;
  isRefreshing: boolean;
}

const EXPIRATION_WARNING_THRESHOLD_SECONDS = 300; // Warn when <= 5 minutes remaining

export async function checkAuthHealth(user: User | null): Promise<AuthHealthState> {
  if (!user) {
    return {
      status: "unauthenticated",
      expiresInSeconds: null,
      expiresInMinutes: null,
      lastCheckedAt: Date.now(),
      isRefreshing: false
    };
  }

  try {
    // 1. Fetch token result (cached or current)
    const tokenResult = await getIdTokenResult(user, false);
    const expirationTimeMs = new Date(tokenResult.expirationTime).getTime();
    const nowMs = Date.now();
    const expiresInSeconds = Math.max(0, Math.floor((expirationTimeMs - nowMs) / 1000));
    const expiresInMinutes = Math.max(0, Math.ceil(expiresInSeconds / 60));

    // 2. Validate network connection status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return {
        status: "offline",
        expiresInSeconds,
        expiresInMinutes,
        lastCheckedAt: Date.now(),
        errorMessage: "Device is offline",
        isRefreshing: false
      };
    }

    // 3. Determine Health Status
    if (expiresInSeconds <= 0) {
      return {
        status: "expired",
        expiresInSeconds: 0,
        expiresInMinutes: 0,
        lastCheckedAt: Date.now(),
        errorMessage: "Session token has expired. Please refresh your session.",
        isRefreshing: false
      };
    } else if (expiresInSeconds <= EXPIRATION_WARNING_THRESHOLD_SECONDS) {
      return {
        status: "nearing_expiration",
        expiresInSeconds,
        expiresInMinutes,
        lastCheckedAt: Date.now(),
        errorMessage: `Session token expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}`,
        isRefreshing: false
      };
    }

    return {
      status: "healthy",
      expiresInSeconds,
      expiresInMinutes,
      lastCheckedAt: Date.now(),
      isRefreshing: false
    };
  } catch (error: any) {
    console.error("Auth health check failed:", error);
    return {
      status: "offline",
      expiresInSeconds: null,
      expiresInMinutes: null,
      lastCheckedAt: Date.now(),
      errorMessage: error?.message || "Failed to verify Firebase session health",
      isRefreshing: false
    };
  }
}

export async function refreshAuthSessionToken(user: User): Promise<{ success: boolean; state: AuthHealthState }> {
  try {
    // Force token refresh with Firebase Auth server
    await getIdToken(user, true);
    const newState = await checkAuthHealth(user);
    return { success: true, state: newState };
  } catch (error: any) {
    console.error("Failed to refresh session token:", error);
    return {
      success: false,
      state: {
        status: "expired",
        expiresInSeconds: 0,
        expiresInMinutes: 0,
        lastCheckedAt: Date.now(),
        errorMessage: "Token refresh failed: " + (error?.message || "Re-authentication required"),
        isRefreshing: false
      }
    };
  }
}

export function startAuthHealthSyncService(
  getUser: () => User | null,
  onHealthUpdate: (state: AuthHealthState) => void,
  intervalMs: number = 20000 // Run every 20 seconds
): () => void {
  let isChecking = false;

  const runCheck = async () => {
    if (isChecking) return;
    isChecking = true;
    const currentUser = getUser();
    const healthState = await checkAuthHealth(currentUser);
    onHealthUpdate(healthState);
    isChecking = false;
  };

  // Run immediate initial check
  runCheck();

  // Schedule periodic background check
  const intervalId = setInterval(runCheck, intervalMs);

  return () => {
    clearInterval(intervalId);
  };
}
