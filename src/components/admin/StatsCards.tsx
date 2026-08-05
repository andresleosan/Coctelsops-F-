import { Activity, ClipboardList, Martini, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type AdminStats = {
  orders: number;
  pending: number;
  activeProducts: number;
  customers: number;
  revenue: number;
};

const definitions = [
  { key: "orders", label: "Pedidos recientes", icon: ClipboardList, tone: "text-cyan-700 bg-cyan-100" },
  { key: "pending", label: "Pendientes", icon: Activity, tone: "text-amber-700 bg-amber-100" },
  { key: "activeProducts", label: "Productos activos", icon: Martini, tone: "text-violet-700 bg-violet-100" },
  { key: "customers", label: "Clientes", icon: Users, tone: "text-emerald-700 bg-emerald-100" },
] as const;

export function StatsCards({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {definitions.map(({ key, label, icon: Icon, tone }) => (
        <Card key={key} className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
            </div>
            {loading ? <Skeleton className="mt-4 h-8 w-16" /> : <p className="mt-4 text-2xl font-bold tabular-nums text-slate-900">{stats?.[key] ?? 0}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
