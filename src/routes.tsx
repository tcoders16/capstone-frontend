// src/routes.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

// Public / Rider
import Home from "./pages/Home";
import RiderLogin from "./pages/RiderLogin";
import RiderSearch from "./pages/RiderSearch";

// Admin
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import UploadItem from "./pages/Admin/UploadItem";
import ReviewPreview from "./pages/Admin/ReviewPreview";
import ConfirmRequests from "./pages/Admin/ConfirmRequests";
import AdminShell from "./components/admin/AdminShell";
import AdminGuard from "./components/admin/AdminGuard";

export const router = createBrowserRouter([
  // Public
  { path: "/", element: <Home /> },
  { path: "/search", element: <RiderSearch /> },

  // Rider (placeholder)
  { path: "/rider/login", element: <RiderLogin /> },

  // Admin login (outside guard/shell)
  { path: "/admin/login", element: <AdminLogin /> },

  // Admin area — guard once, one shell, many children
  {
    path: "/admin",
    element: (
      <AdminGuard>
        <AdminShell />
      </AdminGuard>
    ),
    children: [
      { index: true, element: <AdminDashboard /> }, // /admin
      { path: "upload", element: <UploadItem /> },  // /admin/upload
      { path: "review", element: <ReviewPreview /> }, // /admin/review
      { path: "confirm", element: <ConfirmRequests /> }, // /admin/confirm
    ],
  },

  // Fallback
  { path: "*", element: <Navigate to="/" replace /> },
]);