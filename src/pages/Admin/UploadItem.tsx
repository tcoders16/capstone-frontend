// src/pages/Admin/UploadItem.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageDrop from "../../components/ImageDrop";
import Button from "../../components/Button";
import { fileToBase64 } from "../../lib/file"; // <-- add this import
//from api.ts
import { uploadImageDirect, finalizeUpload, analyseItem } from "../../lib/api";

/** Minimal fields shown on Review screen */
type Extracted = {
  brand: string;
  model: string;
  color: string;
  text: string; // free-form or OCR-like text/summary
};

const GO_STATIONS = [
  "Union Station", "Oakville GO", "Kipling", "Clarkson", "Port Credit",
  "Burlington GO", "Bronte GO", "Milton GO", "Oshawa GO", "Scarborough",
];

// /** PUT helper for real signed uploads (prod) */
// async function putToSignedUrl(url: string, file: File) {
//   const res = await fetch(url, {
//     method: "PUT",
//     headers: { "Content-Type": file.type || "application/octet-stream" },
//     body: file,
//   });
//   if (!res.ok) throw new Error(`Signed upload failed: ${res.status} ${await res.text().catch(()=>"")}`);
// }

// /** Detect our dev “fake” URL so we can bypass the PUT */
// function isFakeSignedUrl(url: string) {
//   return /^https?:\/\/fake-upload\.local\//.test(url);
// }

/** Ensure we pass raw base64 (no data: prefix) to backend when needed */
async function toRawBase64(file: File) {
  const s = await fileToBase64(file);          // your helper returns a string
  return s.startsWith("data:") ? s.split(",")[1] : s;
}

export default function UploadItem() {
  const nav = useNavigate();

  // form state
  const [image, setImage] = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");

  // ui state
  const [touched, setTouched] = useState<{ image?: boolean; location?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // validation
  const errors = useMemo(
    () => ({
      image: !image ? "Please upload a photo of the item." : "",
      location: !location.trim() ? "Enter the station or location where it was found." : "",
    }),
    [image, location],
  );
  const isValid = !errors.image && !errors.location;

  /**
   * Flow:
   * 1) /upload/start -> itemId + (fake|real) signed URL
   * 2) If real: PUT file; if fake (dev): skip
   * 3) /upload/finalize -> create initial DB record
   * 4) /analyse -> ask backend to analyse (base64 in dev; url in prod if you have one)
   * 5) Navigate to Review with the extracted info
   */
async function handleExtract() {
  setTouched({ image: true, location: true });
  setError(null);
  if (!isValid || !image) return;

  try {
    setSubmitting(true);

    // 1) direct upload to your backend (which uploads to S3)
    //    optionally pass a folder like "items" etc.
    const up = await uploadImageDirect(image, {
      fileId: `tmp-${Date.now()}`, // or generate server-side; either is fine
      // folder: "items",          // uncomment if your route supports it
    });
    // up.key is your storagePath; up.signedUrl may be present

    // 2) finalize initial record in your DB
    await finalizeUpload({
      itemId: up.key,                 // or a real itemId if your backend returns one
      storagePath: up.key,            // <- persist this
      locationName: location.trim(),
      description: desc.trim().slice(0, 240),
    });

    // 3) analyse
    // Prefer sending the key so backend can fetch with a server-side signed GET.
    const res = await analyseItem({
      itemId: up.key,                 // or a separate itemId if you have it
      imageUrl: up.signedUrl!,  // matches existing type
      detail: "high",
    });

    const analysisText =
      (res as any).description ??
      (res as any).attributes?.summary ??
      "";

    const extracted: Extracted = {
      brand: "",
      model: "",
      color: "",
      text: analysisText || "Analysis complete.",
    };

    // 4) go to review
    nav("/admin/review", {
      state: {
        image,
        location: location.trim(),
        desc: desc.trim(),
        extracted,
        itemId: up.key,       // carry forward what you persisted
        storagePath: up.key,
      },
    });
  } catch (e: any) {
    console.error(e);
    setError(e?.message || "Upload/analysis failed. Please try again.");
  } finally {
    setSubmitting(false);
  }
}

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-neutral-600">Intake</div>
        <h1 className="text-2xl font-semibold leading-tight">Upload Lost Item</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Add a photo, the location found, and a short description. We’ll extract details and
          let you confirm before saving.
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {/* Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-[0_22px_60px_-32px_rgba(0,0,0,.18)] p-6 space-y-6">
        {/* Image */}
        <section>
          <label className="block text-sm font-medium text-neutral-800">Item photo</label>
          <p className="text-xs text-neutral-600 mb-2">One clear photo works best.</p>
          <ImageDrop
            onFileSelect={(f) => {
              setImage(f);
              setTouched((t) => ({ ...t, image: true }));
            }}
          />
          {touched.image && errors.image ? (
            <p className="mt-2 text-xs text-red-600">{errors.image}</p>
          ) : null}

          {image ? (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={URL.createObjectURL(image)}
                alt="preview"
                className="w-24 h-24 object-contain border rounded-lg bg-white"
              />
              <div className="text-xs text-neutral-600">
                {image.name} • {(image.size / 1024).toFixed(0)} KB
              </div>
            </div>
          ) : null}
        </section>

        {/* Location */}
        <section>
          <label className="block text-sm font-medium text-neutral-800">Location found</label>
          <p className="text-xs text-neutral-600 mb-2">Type a station or stop name (e.g., Oakville GO).</p>
          <input
            list="go-stations"
            type="text"
            className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-[#006341] ${
              touched.location && errors.location ? "border-red-400" : "border-neutral-300"
            }`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, location: true }))}
            placeholder="e.g., Oakville GO"
          />
          <datalist id="go-stations">
            {GO_STATIONS.map((s) => (
              <option value={s} key={s} />
            ))}
          </datalist>
          {touched.location && errors.location ? (
            <p className="mt-2 text-xs text-red-600">{errors.location}</p>
          ) : null}
        </section>

        {/* Description */}
        <section>
          <label className="block text-sm font-medium text-neutral-800">Short description</label>
          <p className="text-xs text-neutral-600 mb-2">What is it? Any distinctive marks?</p>
          <textarea
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#006341]"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={240}
            placeholder='e.g., "Black Logitech mouse with a scratch on the right side"'
          />
          <div className="mt-1 text-[11px] text-neutral-500">{desc.length}/240</div>
        </section>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 mt-6 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-neutral-200">
        <div className="max-w-3xl mx-auto px-0 py-3 flex items-center justify-between">
          <div className="text-xs text-neutral-600">
            Step 1 of 2: Upload → <span className="font-medium">Extract &amp; Review</span>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => nav(-1)} variant="secondary">Cancel</Button>
            <Button onClick={handleExtract} disabled={submitting || !isValid}>
              {submitting ? "Uploading…" : "Extract & Review"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}