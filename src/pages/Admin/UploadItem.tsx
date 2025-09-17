// src/pages/Admin/UploadItem.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageDrop from "../../components/ImageDrop";
import Button from "../../components/Button";
import { startUpload, finalizeUpload, analyseItem } from "../../lib/api"; // + analyseItem
import { fileToBase64 } from "../../lib/file";

/** Optional extracted fields you show on Review screen */
type Extracted = {
  brand: string;
  model: string;
  color: string;
  text: string; // free-form description / OCR-like text
};

const GO_STATIONS = [
  "Union Station", "Oakville GO", "Kipling", "Clarkson", "Port Credit",
  "Burlington GO", "Bronte GO", "Milton GO", "Oshawa GO", "Scarborough",
];

/** Real signed-URL PUT helper (used in prod) */
async function putToSignedUrl(url: string, file: File) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Signed upload failed: ${res.status} ${msg}`);
  }
}

/** Detect our dev “fake” URL so we can bypass real upload */
function isFakeSignedUrl(url: string) {
  return /^https?:\/\/fake-upload\.local\//.test(url);
}

export default function UploadItem() {
  const nav = useNavigate();

  // form state
  const [image, setImage] = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [touched, setTouched] = useState<{ image?: boolean; location?: boolean }>({});

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // simple client-side validation
  const errors = useMemo(
    () => ({
      image: !image ? "Please upload a photo of the item." : "",
      location: !location.trim() ? "Enter the station or location where it was found." : "",
    }),
    [image, location]
  );
  const isValid = !errors.image && !errors.location;

  /**
   * Primary action:
   * 1) ask backend for itemId + signed URL
   * 2) if real URL: PUT file → finalize
   *    if fake URL (dev): skip PUT, still finalize
   * 3) call /api/items/analyse (base64 in dev; URL in prod if you have one)
   * 4) navigate to Review with the analysis result
   */
  async function handleExtract() {
    setTouched({ image: true, location: true });
    setError(null);
    if (!isValid || !image) return;

    try {
      setSubmitting(true);

      // 1) Ask backend for signed URL + itemId (works for both dev and prod)
      const start = await startUpload(image.type || "image/jpeg"); // { itemId, uploadUrl, storagePath }

      // 2) Upload if URL is real; skip in dev
      const devMock = isFakeSignedUrl(start.uploadUrl);
      if (!devMock) {
        await putToSignedUrl(start.uploadUrl, image);
      }

      // 3) Finalize: create the initial DB record (status=found)
      await finalizeUpload({
        itemId: start.itemId,
        storagePath: start.storagePath,
        locationName: location.trim(),
        description: desc.trim().slice(0, 240),
        // foundAt: new Date().toISOString(), // optional
      });

      // 4) Analyse the image
      //    - In dev (no real upload), send base64
      //    - In prod (real upload), you can pass a public URL if you generate one
      let analysisText = "";
      if (devMock) {
        const base64 = await fileToBase64(image);
        const analysed = await analyseItem({
          itemId: start.itemId,
          imageBase64: base64,
          detail: "auto",
          prompt:
            "Describe this lost item. Include likely brand/model if visible, color, and notable features.",
        });
        analysisText = analysed.description;
      } else {
        // If you expose a public image URL after upload, pass it here instead of base64:
        // const analysed = await analyseItem({ itemId: start.itemId, imageUrl: publicUrl, detail: "high" });
        // analysisText = analysed.description;
      }

      // 5) Prepare a minimal extracted object for the review screen
      const extracted: Extracted = {
        brand: "",
        model: "",
        color: "",
        text: analysisText || "Analysis complete.",
      };

      // 6) Go to review with everything needed
      nav("/admin/review", {
        state: {
          image,
          location: location.trim(),
          desc: desc.trim(),
          extracted,
          itemId: start.itemId,
          storagePath: start.storagePath,
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
      {/* Step header */}
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

          {/* Inline preview */}
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