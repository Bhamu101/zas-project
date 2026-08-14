import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { GLASS_CARD } from "../../lib/glass";

const styles = {
  critical: { icon: AlertOctagon, iconColor: "text-red-500", hex: "#ef4444", badgeText: "text-red-600", badgeLabel: "Critical" },
  warning: { icon: AlertTriangle, iconColor: "text-amber-500", hex: "#f59e0b", badgeText: "text-amber-700", badgeLabel: "Warning" },
  success: { icon: CheckCircle2, iconColor: "text-brand", hex: "#16a34a", badgeText: "text-brand-dark", badgeLabel: "Done" },
  info: { icon: Info, iconColor: "text-blue-500", hex: "#3b82f6", badgeText: "text-blue-700", badgeLabel: "Info" },
};

export default function RecentAlerts({ alerts }) {
  return (
    <div className={`${GLASS_CARD} p-4 h-full`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-ink">RECENT ALERTS</h3>
        <button className="text-xs font-medium text-brand hover:underline">View All</button>
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 3).map((a) => {
          const s = styles[a.level] || styles.info;
          const Icon = s.icon;
          return (
            <div key={a.id} className="flex items-center gap-3">
              <Icon size={20} className={`${s.iconColor} shrink-0`} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink font-medium truncate">{a.text}</p>
                <p className="text-xs text-muted">{a.time} &middot; {a.category}</p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${s.badgeText}`}
                style={{ backgroundColor: `${s.hex}1a` }}
              >
                {s.badgeLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
