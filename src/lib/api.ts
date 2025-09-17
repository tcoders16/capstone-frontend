// src/lib/api.ts
// ==========================================================
// Central API client for frontend → backend requests
// - Wraps fetch with JSON parsing + error handling
// - Exposes typed functions for each backend route
// ==========================================================

/**
 * Base URL for backend API.
 * - Uses VITE_BACKEND_API_BASE env var if set (strip trailing slash).
 * - Defaults to http://localhost:4000 for dev.
 */
const API_BASE =
  import.meta.env.VITE_BACKEND_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:4000";

/**
 * Helper to fetch JSON with good error messages.
 * - Prefixes URL with API_BASE.
 * - Parses JSON if possible; falls back to raw text.
 * - Throws on !res.ok with meaningful error.
 */


export function analyseImageFromUpload(input: {
  itemId: string;
  imageUrl?: string;
  imageBase64?: string; // raw, without data: prefix
  detail?: "low" | "high" | "auto";
  prompt?: string;
}) {
  return json<{ ok: true; itemId: string; attributes?: any; description?: string }>(
    "/api/items/analyse",
    { method: "POST", body: JSON.stringify(input) }
  );
}



async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data as T;
}

/* ==========================================================
   TYPES
   ========================================================== */

export type StartUploadRes = {
  itemId: string;
  uploadUrl: string;   // signed PUT URL (fake in dev)
  storagePath: string; // storage path (e.g., lostfound/<id>.jpg)
};

export type FinalizeRes = { ok: true; itemId: string };

export type Item = {
  id: string;
  desc: string;
  imageUrl?: string;   // optional until real storage/CDN wired
  imagePath?: string;
  location: { name: string };
  status: string;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
};

// Response type for analysis endpoint
export type AnalyseRes = {
  ok: true;
  itemId: string;
  description: string; // free-form analysis from OpenAI
};

/* ==========================================================
   ADMIN LOGIN
   ========================================================== */

/**
 * POST /api/admin/login
 * Returns JWT token for authenticated admin session.
 * - In dev, falls back to a mock token if backend login fails.
 */
export async function loginAdmin(
  email: string,
  password: string
): Promise<{ token: string }> {
  try {
    return await json<{ token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch (e: any) {
    // fallback in dev (mock auth)
    if (import.meta.env.DEV) {
      console.warn("[loginAdmin] falling back to mock token:", e?.message);
      await new Promise((r) => setTimeout(r, 300));
      if (!email || !password) throw new Error("Invalid credentials");
      return { token: `dev-admin-token-${Date.now()}` };
    }
    throw e;
  }
}

/* ==========================================================
   ITEMS
   ========================================================== */

/**
 * Ask backend for a signed upload URL + itemId.
 * Frontend PUTs the file to that URL, then calls finalizeUpload.
 */
export function startUpload(contentType = "image/jpeg") {
  return json<StartUploadRes>("/api/items/upload/start", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

/**
 * Finalize an upload:
 * - Creates initial DB record.
 * - Dispatches background analysis job.
 */
export function finalizeUpload(input: {
  itemId: string;
  storagePath: string;
  locationName: string;
  description?: string;
  foundAt?: string;
}) {
  return json<FinalizeRes>("/api/items/upload/finalize", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * List all items (admin view).
 */
export function listItems() {
  return json<{ items: Item[] }>("/api/items");
}

/**
 * Fetch one item by ID.
 */
export function getItem(id: string) {
  return json<Item>(`/api/items/${encodeURIComponent(id)}`);
}

/**
 * Analyse endpoint (calls OpenAI vision).
 * - Accepts base64 or URL image.
 * - Returns free-form description.
 */
export function analyseItem(input: {
  itemId: string;
  imageBase64?: string;
  imageUrl?: string;
  detail?: "low" | "high" | "auto";
  prompt?: string;
}) {
  return json<AnalyseRes>("/api/items/analyse", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ==========================================================
   HEALTH (optional ping)
   ========================================================== */

/**
 * Simple ping to /healthz (used for readiness checks).
 */
export function ping() {
  return json<{ ok: boolean }>("/healthz").catch(() => undefined);
}