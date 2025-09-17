import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth";

export default function AdminShell() {
  const { touch, logout } = useAuth();
  const nav = useNavigate();

  function handleLogout() {
    logout();
    nav("/admin/login"); // redirect back to login
  }

  return (
    <div
      className="min-h-dvh grid grid-cols-[240px_1fr] bg-white"
      onMouseMove={touch}
      onClick={touch}
      onKeyDown={touch}
    >
      {/* Sidebar */}
      <aside className="bg-white border-r flex flex-col">
        <div className="h-14 px-4 flex items-center gap-3 border-b">
          <div className="w-6 h-6 rounded-md bg-gray-200" />
          <div className="font-semibold text-sm">Ontario Service Admin</div>
        </div>

        {/* Primary nav */}
        <nav className="p-3 text-sm space-y-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg ${
                isActive ? "bg-neutral-100 font-medium" : "hover:bg-neutral-50"
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/upload"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg ${
                isActive ? "bg-neutral-100 font-medium" : "hover:bg-neutral-50"
              }`
            }
          >
            Upload a Lost Item
          </NavLink>

          <NavLink
            to="/admin/review"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg ${
                isActive ? "bg-neutral-100 font-medium" : "hover:bg-neutral-50"
              }`
            }
          >
            Review Uploaded Items
          </NavLink>

          <NavLink
            to="/admin/confirm"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg ${
                isActive ? "bg-neutral-100 font-medium" : "hover:bg-neutral-50"
              }`
            }
          >
            Confirm Requests
          </NavLink>
        </nav>

        {/* Divider + secondary nav */}
        <div className="mt-auto p-3 border-t space-y-1">
          <Link
            to="/"
            className="block px-3 py-2 rounded-lg text-[#006341] hover:bg-neutral-50 font-medium"
          >
            ← Public Site
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="min-h-dvh flex flex-col">
        <header className="h-14 border-b bg-white px-4 flex items-center justify-between">
          <div className="font-medium">Admin</div>
          {/* Quick shortcut — keep only one here for clarity */}
          <Link to="/" className="text-sm font-medium text-[#006341] hover:underline">
            ← Back to Public Site
          </Link>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}