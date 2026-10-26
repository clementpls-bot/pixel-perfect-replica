import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Can } from "@/lib/data";

/** Renders a product photo when available, falling back to a stylised can if the URL fails. */
export function CanArt({ can, brandName, missing, className }: { can: Can; brandName?: string | undefined; missing?: boolean | undefined; className?: string | undefined }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [can.id, can.image_url]);
  const style = { "--c1": can.color_primary, "--c2": can.color_secondary } as React.CSSProperties;
  return (
    <div className={cn("relative mx-auto aspect-[1/1.9] w-full max-w-[120px] transition-all duration-500", missing && "grayscale opacity-40", className)} style={style}>
      {can.image_url && !imageFailed ? (
        <img
          src={can.image_url}
          alt={can.name}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="relative h-full w-full overflow-hidden rounded-[18%/9%] bg-[linear-gradient(160deg,var(--c1)_0%,var(--c1)_55%,var(--c2)_100%)] shadow-[inset_-10px_0_18px_rgb(0_0_0/0.35),inset_8px_0_12px_rgb(255_255_255/0.18)]">
          <div className="absolute inset-x-0 top-0 h-[7%] bg-[linear-gradient(180deg,#d9d9d9,#8a8a8a)]" />
          <div className="absolute inset-x-0 bottom-0 h-[5%] bg-[linear-gradient(0deg,#9a9a9a,#cfcfcf)]" />
          <div className="absolute inset-y-[12%] left-1/2 flex -translate-x-1/2 items-center">
            <span className="font-display text-[10px] font-black uppercase tracking-widest text-[var(--c2)] [writing-mode:vertical-rl] rotate-180 drop-shadow">
              {brandName ?? ""}
            </span>
          </div>
          <div className="absolute bottom-[10%] inset-x-[12%] h-[3px] rounded-full bg-[var(--c2)] opacity-80" />
        </div>
      )}
    </div>
  );
}
