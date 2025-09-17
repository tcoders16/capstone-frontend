import { Link } from "react-router-dom";

export default function AppShell({ children }:{children:React.ReactNode}){
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-neutral-200/70 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-green-600" aria-hidden/>
            <span className="text-[15px] font-semibold tracking-tight">Transit Lost &amp; Found</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/help" className="hover:underline">Help</Link>
            <Link to="/admin/login" className="hover:underline">Ontario Service Admin</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-neutral-200/70">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between text-xs text-neutral-600">
          <div>© {new Date().getFullYear()} Transit Lost &amp; Found</div>
          <nav className="flex gap-4">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/accessibility" className="hover:underline">Accessibility</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}