import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({
  label,
  value,
  note,
  subtitle,
  icon: Icon,
  trend,
  up = true,
  color,
}) {
  const sub = subtitle || note;

  if (Icon || trend) {
    return (
      <article className="card flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          {Icon ? (
            <div className="w-11 h-11 grid place-items-center rounded-xl bg-cyan-accent/15 text-cyan-accent shrink-0">
              <Icon size={21} />
            </div>
          ) : (
            <span />
          )}
          {trend && (
            <span
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                up
                  ? "bg-badge-green/15 text-badge-green"
                  : "bg-badge-red/15 text-badge-red"
              }`}
            >
              {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {trend}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-secondary truncate">{label}</p>
            {sub && <p className="text-xs text-text-secondary/80 mt-1 truncate">{sub}</p>}
          </div>
          <p
            className={`text-2xl font-black tabular-nums text-right shrink-0 ${
              color || "text-white"
            }`}
          >
            {value}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="card flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-text-secondary text-sm font-medium truncate">{label}</p>
        {sub && <p className="text-xs text-text-secondary mt-1 truncate">{sub}</p>}
      </div>
      <p
        className={`text-2xl font-black tabular-nums text-right shrink-0 ${
          color || "text-white"
        }`}
      >
        {value}
      </p>
    </article>
  );
}
