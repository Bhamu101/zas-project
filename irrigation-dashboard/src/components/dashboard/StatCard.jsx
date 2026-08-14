import { GLASS_CARD } from "../../lib/glass";

export default function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  valueColor = "text-ink",
  sublabel,
  sublabelColor = "text-muted",
  children,
}) {
  return (
    <div className={`${GLASS_CARD} p-4 h-full flex flex-col`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[11px] font-bold tracking-wide text-muted uppercase pt-1.5">{label}</p>
        <Icon size={20} className={`${iconColor} shrink-0`} strokeWidth={1.75} />
      </div>
      <p className={`text-2xl font-bold ${valueColor} leading-none`}>{value}</p>
      <p className={`text-xs mt-1.5 ${sublabelColor}`}>{sublabel}</p>
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}
