// src/pages/ReviewPreview.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import { fileToBase64 } from "../../lib/file";
import { analyseImageFromUpload, saveAnalysedItemToMongo } from "../../lib/api";

/** Shape of attributes returned by analysis */
type Attributes = {
  category?: string;
  brand?: string;
  model?: string;
  color?: string;
  material?: string;
  shape?: string;
  size?: string;
  condition?: string;
  text?: string;
  serialNumber?: string;
  labels?: string[];
  summary?: string;
  keywords?: string[];
  distinctiveFeatures?: string[];
  confidence?: number;
};





/** Little UI chip */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700">
      {children}
    </span>
  );
}

/** Skeleton placeholder while loading */
function SkeletonRow() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 w-40 rounded bg-neutral-200" />
      <div className="h-3 w-24 rounded bg-neutral-200" />
    </div>
  );
}

/** Helper: strip "data:*;base64," prefix if present */
function toRawBase64(s: string) {
  return s.startsWith("data:") ? s.split(",")[1] : s;
}

export default function ReviewPreview() {
  const nav = useNavigate();

  // This page expects to be navigated to with state from UploadItem.tsx
  const { state } = useLocation() as {
    state?: {
      image: File;
      location: string;
      desc: string;
      itemId: string;      // your logical id (we pass this through to analysis & save)
      storagePath: string; // (optional) S3 key if you carried it forward
    };
  };

  // If someone hits this URL directly, guide them back
  if (!state) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold">Nothing to review</h1>
          <p className="text-sm text-neutral-600">
            Please upload an item first to see the review screen.
          </p>
          <div className="mt-4">
            <Button onClick={() => nav("/admin/upload")}>Go to Upload</Button>
          </div>
        </div>
      </main>
    );
  }

  const { image, location, desc, itemId } = state;

  // UI/analysis state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [attrs, setAttrs] = useState<Attributes | null>(null);

  // Local preview for the selected image
  const previewUrl = useMemo(() => URL.createObjectURL(image), [image]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  // Run analysis once on mount (for this image/item)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // fileToBase64 may give a data URL; backend often prefers the raw payload
        const dataUrlOrRaw = await fileToBase64(image);
        const raw = toRawBase64(dataUrlOrRaw);

        const res = await analyseImageFromUpload({
          itemId,
          imageBase64: raw,
          detail: "auto",
        });

        if (cancelled) return;

        // Prefer structured attributes; fall back to free-form description
        setAttrs(res.attributes || { summary: res.description ?? "" });
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Analysis failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [image, itemId]);

  /** Save the analysed payload into MongoDB via our API */
  async function handleSubmit() {
    // Do not allow saving before the analysis result is ready
    if (!attrs) {
      setErr("No attributes to save yet. Please wait for analysis to complete.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      // Send minimal, normalized payload expected by your backend
      await saveAnalysedItemToMongo({
        itemId,                  // either your logical id or S3 key
        location: location.trim(),
        desc: desc.trim(),
        attributes: attrs,       // IMPORTANT: pass the VARIABLE, not the type
        // image: { bucket, key, s3Uri } // include if you carried these forward
      });

      // Navigate only after a successful save
      alert("Item successfully stored in database!");
      nav("/admin/dashboard");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to save item to database");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Review</p>
        <h1 className="text-2xl font-semibold leading-tight">Confirm item details</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Check the photo and the extracted details. You can go back to adjust anything.
        </p>
        {err && (
          <p className="mt-2 text-sm text-red-600">
            {err}
          </p>
        )}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Photo & basics */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="overflow-hidden rounded-xl border bg-neutral-50">
            <img
              src={previewUrl}
              alt="Item preview"
              className="max-h-[300px] w-full object-contain"
            />
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="font-medium text-neutral-800">Location: </span>
              <span className="text-neutral-700">{location}</span>
            </div>
            <div>
              <span className="font-medium text-neutral-800">Description: </span>
              <span className="text-neutral-700">{desc || "—"}</span>
            </div>
          </div>
        </section>

        {/* Right: AI analysis */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-900">AI analysis</h2>
            {typeof attrs?.confidence === "number" && (
              <Chip>{Math.round((attrs.confidence || 0) * 100)}% confidence</Chip>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="mt-4 space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* Error box */}
          {err && !loading && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          {/* Attributes */}
          {!loading && !err && attrs && (
            <div className="mt-4 space-y-4">
              {attrs.summary && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
                  {attrs.summary}
                </div>
              )}

              {/* chips row */}
              <div className="flex flex-wrap gap-2">
                {attrs.category && <Chip>{attrs.category}</Chip>}
                {attrs.brand && <Chip>{attrs.brand}</Chip>}
                {attrs.model && <Chip>{attrs.model}</Chip>}
                {attrs.color && <Chip>{attrs.color}</Chip>}
                {attrs.material && <Chip>{attrs.material}</Chip>}
                {attrs.shape && <Chip>{attrs.shape}</Chip>}
                {attrs.size && <Chip>size: {attrs.size}</Chip>}
                {attrs.condition && <Chip>{attrs.condition}</Chip>}
              </div>

              {/* lists */}
              {!!attrs.labels?.length && (
                <div className="text-sm">
                  <div className="mb-1 font-medium text-neutral-900">Labels / logos</div>
                  <div className="flex flex-wrap gap-1.5">
                    {attrs.labels.map((l, i) => (
                      <Chip key={i}>{l}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {!!attrs.distinctiveFeatures?.length && (
                <div className="text-sm">
                  <div className="mb-1 font-medium text-neutral-900">Distinctive features</div>
                  <ul className="list-disc pl-5 text-neutral-700">
                    {attrs.distinctiveFeatures.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!!attrs.keywords?.length && (
                <div className="text-sm">
                  <div className="mb-1 font-medium text-neutral-900">Keywords</div>
                  <div className="flex flex-wrap gap-1.5">
                    {attrs.keywords.map((k, i) => (
                      <Chip key={i}>{k}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {attrs.text && (
                <div className="text-sm">
                  <div className="mb-1 font-medium text-neutral-900">OCR</div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 font-mono text-[12px] text-neutral-800">
                    {attrs.text}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 mt-8 border-t border-neutral-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="text-xs text-neutral-600">
            Step 2 of 2: Review → <span className="font-medium text-neutral-800">Confirm</span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => nav(-1)}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !!err || saving}>
              {saving ? "Saving…" : loading ? "Analyzing…" : "Send to Database"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}