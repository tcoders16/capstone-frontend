import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../store/auth";

export default function AdminLogin() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await login("admin", email, pw);
    setBusy(false);
    if (ok) nav("/admin");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-white">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded p-6">
        <h1 className="text-xl font-semibold mb-1">Ontario Service Admin Panel</h1>
        <p className="text-sm text-neutral-600 mb-4">Staff sign in</p>
        <label className="block mb-3">
          <div className="text-sm mb-1">Email</div>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
        </label>
        <label className="block mb-4">
          <div className="text-sm mb-1">Password</div>
          <input type="password" className="w-full border rounded px-3 py-2" value={pw} onChange={e=>setPw(e.target.value)} />
        </label>
        <button disabled={busy} className="w-full rounded bg-[#006341] text-white py-2 hover:bg-[#005637]">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div className="mt-3 text-xs text-neutral-600">
          Not staff? <Link to="/" className="underline">Go back</Link>
        </div>
      </form>
    </div>
  );
}