import { useSearchParams } from "react-router-dom";
export default function RiderSearch(){
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold mb-2">Search results</h1>
      <p className="text-sm text-neutral-600 mb-4">Query: <span className="font-mono">{q || "—"}</span></p>
      <div className="text-neutral-600 text-sm">Results will appear here (wire to vector search later).</div>
    </main>
  );
}