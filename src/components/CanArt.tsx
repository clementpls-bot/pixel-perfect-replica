import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Can } from "@/lib/data";

/** Shows the real product photo; unowned cans stay visible beneath a subtle lock overlay. */
export function CanArt({ can, brandName, missing, className }: { can: Can; brandName?: string | undefined; missing?: boolean | undefined; className?: string | undefined }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showPhoto = Boolean(can.image_url && failedImageUrl !== can.image_url);

  return (
    <div className={cn("relative mx-auto aspect-[1/1.9] w-full max-w-[120px] transition-all duration-300", className)}>
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
      {missing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20" aria-label="Canette non possédée" title="Ajoute cette canette à ton mur pour la débloquer">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-black/45 text-white shadow-lg backdrop-blur-sm">
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      )}
    </div>
  );
}
