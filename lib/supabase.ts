// ---------------------------------------------------------------------------
// Supabase helpers — raw fetch(), no SDK dependency
// ---------------------------------------------------------------------------

export interface UserSettings {
  user_id: string;
  gateway_url: string;
  gateway_token?: string | null;
  updated_at?: string;
}

function getSupabaseUrl(): string {
  const projectId = process.env.MCP_USE_OAUTH_SUPABASE_PROJECT_ID;
  if (!projectId) throw new Error("MCP_USE_OAUTH_SUPABASE_PROJECT_ID is not set");
  return `https://${projectId}.supabase.co`;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return key;
}

/**
 * Fetch the user's gateway settings from user_settings table.
 * Returns null if no row exists.
 */
export async function getUserSettings(
  accessToken: string,
  userId: string,
): Promise<UserSettings | null> {
  const base = getSupabaseUrl();
  const url = `${base}/rest/v1/user_settings?user_id=eq.${userId}&select=*`;

  const res = await fetch(url, {
    headers: {
      apikey: getAnonKey(),
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase query failed: ${res.status} ${await res.text()}`);
  }

  const rows: UserSettings[] = await res.json();
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Upsert the user's gateway settings.
 */
export async function saveUserSettings(
  accessToken: string,
  userId: string,
  gatewayUrl: string,
  gatewayToken?: string,
): Promise<UserSettings> {
  const base = getSupabaseUrl();
  const url = `${base}/rest/v1/user_settings`;

  const body: Record<string, unknown> = {
    user_id: userId,
    gateway_url: gatewayUrl,
    updated_at: new Date().toISOString(),
  };
  if (gatewayToken !== undefined) {
    body.gateway_token = gatewayToken || null;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: getAnonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Supabase upsert failed: ${res.status} ${await res.text()}`);
  }

  const rows: UserSettings[] = await res.json();
  return rows[0];
}
