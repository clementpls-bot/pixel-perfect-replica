import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function PageHeading({ title, eyebrow, children, action }: { title: string; eyebrow: string; children?: ReactNode; action?: ReactNode }) {
  return <header className="page-heading">
    <div className="min-w-0 flex-1">
      <span className="sticker-label"><Sparkles className="h-3 w-3" aria-hidden="true" />{eyebrow}</span>
      <h1 className="mt-3 text-3xl sm:text-4xl">{title}</h1>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
    {action && <div className="shrink-0 pt-1">{action}</div>}
  </header>;
}