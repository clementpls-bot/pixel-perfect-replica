import { pct } from "@/lib/achievements";

export function ProgressBar({ value, total, label, color }: { value: number; total: number; label?: string; color?: string }) {
  const p = pct(value, total);
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-semibold">{label}</span>
          <span className="tabular-nums text-muted-foreground"><b className="text-foreground">{value}</b> / {total} · {p}%</span>
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-progress transition-[width] duration-700" style={{ width: `${p}%`, ...(color ? { background: color } : {}) }} />
      </div>
    </div>
  );
}
