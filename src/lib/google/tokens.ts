import type { GoogleConnection } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "./crypto";
import { refreshAccessToken } from "./oauth";
import { getGoogleEnv } from "@/lib/env";

export async function getStoredTokens(connectionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_google_oauth_tokens", { target_connection_id: connectionId });
  if (error) throw new Error("google_token_read_failed");
  return data?.[0] ?? null;
}

export async function storeTokens(connectionId: string, accessToken: string | null, refreshToken: string, expiresAt: Date | null) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("store_google_oauth_tokens", {
    target_connection_id: connectionId,
    access_token_ciphertext: accessToken ? encryptSecret(accessToken) : null,
    refresh_token_ciphertext: encryptSecret(refreshToken),
    expires_at: expiresAt?.toISOString() ?? null,
  });
  if (error) throw new Error("google_token_write_failed");
}

export async function getValidAccessToken(connection: Pick<GoogleConnection,"id"|"token_expires_at">, forceRefresh = false): Promise<string> {
  if (getGoogleEnv().GOOGLE_API_MOCK === "true") return "mock-access-token";
  const stored = await getStoredTokens(connection.id);
  if (!stored) throw new Error("google_reconnect_required");
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (!forceRefresh && stored.encrypted_access_token && expiresAt > Date.now() + 120_000) {
    return decryptSecret(stored.encrypted_access_token);
  }
  const refreshToken = decryptSecret(stored.encrypted_refresh_token);
  try {
    const refreshed = await refreshAccessToken(refreshToken);
    await storeTokens(connection.id, refreshed.access_token, refreshed.refresh_token ?? refreshToken, new Date(Date.now() + refreshed.expires_in * 1000));
    return refreshed.access_token;
  } catch {
    const admin = createAdminClient();
    await admin.from("google_connections").update({ status:"error", last_error_code:"token_refresh_failed" }).eq("id", connection.id);
    throw new Error("google_reconnect_required");
  }
}
