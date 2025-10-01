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

/** Build a proper URL from a path or absolute URL */
function toURL(urlOrPath: string): string {
  // If caller passed an absolute URL, use it as-is.
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;

  // Otherwise treat it as a path and join with API_BASE.
  if (urlOrPath.startsWith("/")) return `${API_BASE}${urlOrPath}`;
  return `${API_BASE}/${urlOrPath}`;
}

/* ==========================================================
   LOW-LEVEL JSON FETCH
   ========================================================== */

async function json<T>(urlOrPath: string, init?: RequestInit): Promise<T> {
  const url = toURL(urlOrPath);

  const res = await fetch(url, {
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
   UPLOAD (S3 DIRECT)
   ========================================================== */

export type UploadImageResponse = {
  bucket: string;
  key: string;        // storagePath to persist
  s3Uri: string;
  signedUrl?: string; // if your backend returns it
  publicUrl?: string; // if you decide to make objects public
};

export async function uploadImageDirect(
  file: File,
  opts?: { fileId?: string; folder?: string }
) {
  const fd = new FormData();
  fd.append("file", file);
  if (opts?.fileId) fd.append("fileId", opts.fileId);
  if (opts?.folder) fd.append("folder", opts.folder);

  // Use toURL to avoid accidental double-basing here as well.
  const res = await fetch(toURL("/api/upload/s3/upload-image"), {
    method: "POST",
    body: fd, // don't set Content-Type; browser sets multipart boundary
  });

  if (!res.ok)
    throw new Error(
      `Upload failed: ${res.status} ${await res.text().catch(() => "")}`
    );

  return (await res.json()) as UploadImageResponse;
}

/* ==========================================================
   ANALYSIS (OpenAI Vision, etc.)
   ========================================================== */

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

/* Legacy alias (kept for compatibility with existing calls) */
export type AnalyseRes = {
  ok: true;
  itemId: string;
  description: string;
};
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
   SAVE ANALYSED ITEM → MONGODB (NEW ENDPOINT)
   ========================================================== */

export type AnalysedAttributes = Record<string, any>;

export type SaveAnalysedItemPayload = {
  itemId: string;                 // S3 key or your logical item id
  location: string;               // e.g., "Oakville GO"
  desc: string;                   // short description
  attributes: AnalysedAttributes; // the blob you printed (brand, color, summary, etc.)
  image?: { bucket?: string; key?: string; s3Uri?: string }; // optional
};

export type SaveAnalysedItemResponse = {
  ok: boolean;
  item: {
    _id: string;
    itemId: string;
    locationName: string;
    description: string;
    attributes?: AnalysedAttributes;
    image?: { bucket?: string; key?: string; s3Uri?: string; signedUrl?: string };
    createdAt: string;
    updatedAt: string;
  };
};

/**
 * POST /api/upload/mongodb/item
 * Persists the analysed payload into MongoDB.
 * Your server registers the prefix and POST "/" under it.
 */
export function saveAnalysedItemToMongo(payload: SaveAnalysedItemPayload) {
  return json<SaveAnalysedItemResponse>("/api/upload/mongodb/item", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ==========================================================
   LEGACY ITEMS (if you still use these elsewhere)
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

export function startUpload(contentType = "image/jpeg") {
  return json<StartUploadRes>("/api/items/upload/start", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

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

export function listItems() {
  return json<{ items: Item[] }>("/api/items");
}

export function getItem(id: string) {
  return json<Item>(`/api/items/${encodeURIComponent(id)}`);
}

/* ==========================================================
   ADMIN LOGIN
   ========================================================== */

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
   HEALTH (optional ping)
   ========================================================== */

export function ping() {
  return json<{ ok: boolean }>("/healthz").catch(() => undefined);
}