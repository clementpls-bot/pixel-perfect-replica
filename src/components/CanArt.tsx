import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Can } from "@/lib/data";

/** Shows the real product photo; never substitutes a fabricated can illustration. */
export function CanArt({ can, brandName, missing, className }: { can: Can; brandName?: string | undefined; missing?: boolean | undefined; className?: string | undefined }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showPhoto = Boolean(can.image_url && failedImageUrl !== can.image_url);

  return (
    <div className={cn("relative mx-auto aspect-[1/1.9] w-full max-w-[120px] transition-all duration-500", missing && "grayscale opacity-40", className)}>
      {showPhoto ? (
        <img
          src={can.image_url!}
          alt={can.name}
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
          onError={() => setFailedImageUrl(can.image_url)}
        />
      ) : (
        <div role="img" aria-label={`Photo indisponible pour ${can.name}`} className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 p-2 text-center">
          <span className="text-2xl" aria-hidden="true">🥫</span>
          <span className="mt-2 text-[10px] font-semibold text-muted-foreground">Photo indisponible</span>
          {brandName && <span className="mt-1 text-[9px] text-muted-foreground">{brandName}</span>}
        </div>
      )}
    </div>
  );
}
