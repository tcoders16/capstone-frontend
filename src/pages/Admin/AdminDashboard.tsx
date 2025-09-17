import StatCard from "./StatCard";
import ActionCard from "./ActionCard";
import QuickActions from "./QuickActions";
import RecentActivity from "./RecentActivity";
import type { AdminAction, AdminStat } from "../../lib/types";

export default function AdminDashboard() {
  // In production, fetch these via your API. These constants are placeholders.
  const stats: AdminStat[] = [
    { key: "Pending matches", value: "8" },
    { key: "New items (24h)", value: "42" },
    { key: "Avg. claim time", value: "2.1 days" },
  ];

  const actions: AdminAction[] = [
    { title: "Upload a Lost Item", desc: "Intake: image → location → extract → preview → send.", cta: "Go", to: "/admin/upload" },
    { title: "Confirm Requests", desc: "Review owner requests and approve matches.", cta: "Review", to: "/admin/review" },
    { title: "Search Items", desc: "Lookup any item record by keyword or ID.", cta: "Open", to: "/search" },
  ];

  return (
    <div className="space-y-8">
      {/* Page header with quick actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Ontario Service Admin</h1>
          <p className="text-sm text-neutral-600">Manage uploads, confirmations, and search the database.</p>
        </div>
        <QuickActions />
      </div>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.key} label={s.key} value={s.value} />
        ))}
      </section>

      {/* Primary actions */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-700 mb-3">Tasks</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {actions.map((a) => (
            <ActionCard key={a.title} title={a.title} desc={a.desc} cta={a.cta} to={a.to} />
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-700 mb-3">Recent activity</h2>
        <RecentActivity />
      </section>
    </div>
  );
}