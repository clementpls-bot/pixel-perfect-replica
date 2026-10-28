import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Can } from "@/lib/data";

/** Affiche la photo d'origine sans filtre ; le cadenas reste discret dans un coin. */
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
        <span
          className="absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/90 bg-white/95 text-slate-700 shadow-md ring-1 ring-black/5"
          aria-label="Canette non possédée"
          title="Ajoute cette canette à ton mur pour la débloquer"
        >
          <LockKeyhole className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
