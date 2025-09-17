// src/pages/ConfirmRequests.tsx
import Button from "../../components/Button";

type Request = {
  id: string;
  image: string;
  location: string;
  desc: string;
  extracted: { brand: string; model: string; color: string; text: string };
};

const mockRequests: Request[] = [
  {
    id: "req-1",
    image: "/mock/mouse.jpg", // put sample image in public/mock/
    location: "Oakville GO",
    desc: "Black Logitech mouse with scratch on right side",
    extracted: { brand: "Logitech", model: "M720", color: "Black", text: "Logi" }
  },
  {
    id: "req-2",
    image: "/mock/backpack.jpg",
    location: "Union Station",
    desc: "Blue Jansport backpack",
    extracted: { brand: "JanSport", model: "-", color: "Blue", text: "JanSport" }
  },
];

export default function ConfirmRequests() {
  function handleDecision(id: string, decision: "approve" | "reject") {
    console.log(`Request ${id} ${decision}d`);
    alert(`Request ${decision}d successfully!`);
  }

  return (
    <main className="max-w-4xl mx-auto py-10 px-4 space-y-8">
      <h1 className="text-2xl font-bold">Confirm Owner Requests</h1>
      <p className="text-sm text-neutral-600">
        Review owner claims for lost items. Approve if details match, reject otherwise.
      </p>

      {mockRequests.map(req => (
        <div key={req.id} className="rounded-xl border p-5 bg-white shadow-sm">
          <div className="flex gap-4">
            <img src={req.image} alt={req.desc} className="w-32 h-32 object-contain border rounded" />
            <div className="flex-1">
              <p><strong>Location:</strong> {req.location}</p>
              <p><strong>Description:</strong> {req.desc}</p>
              <p><strong>Brand:</strong> {req.extracted.brand}</p>
              <p><strong>Model:</strong> {req.extracted.model}</p>
              <p><strong>Color:</strong> {req.extracted.color}</p>
              <p><strong>OCR:</strong> {req.extracted.text}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={() => handleDecision(req.id, "approve")}>Approve</Button>
            <Button variant="danger" onClick={() => handleDecision(req.id, "reject")}>Reject</Button>
          </div>
        </div>
      ))}
    </main>
  );
}