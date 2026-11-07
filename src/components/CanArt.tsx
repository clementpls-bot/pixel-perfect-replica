import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanPlaceholder } from "@/components/CanPlaceholder";
import type { Can } from "@/lib/data";

/** Affiche la photo d'origine sans filtre ; le cadenas reste discret dans un coin. */
export function CanArt({ can, brandName, missing, showLock, className }: { can: Can; brandName?: string | undefined; missing?: boolean | undefined; showLock?: boolean | undefined; className?: string | undefined }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<{ source: string; scale: number } | null>(null);
  const showPhoto = Boolean(can.image_url && failedImageUrl !== can.image_url);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!can.image_url || imageScale?.source === can.image_url) return;

    const image = event.currentTarget;
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    // Une photo plus large que le format naturel d'une canette contient souvent
    // davantage de marge latérale : on compense par un zoom modéré et plafonné.
    const scale = Math.min(1.8, Math.max(1, aspectRatio / 0.32));
    setImageScale({ source: can.image_url, scale });
  };

  const scale = imageScale?.source === can.image_url ? imageScale.scale : 1;

  return (
    <div className={cn("relative z-10 mx-auto aspect-[1/1.9] w-full max-w-[120px] overflow-visible transition-all duration-300", className)}>
      {showPhoto ? (
        <img
          src={can.image_url!}
          alt={can.name}
          className={cn("h-full w-full object-contain transition-[transform,filter] duration-300", missing && "grayscale")}
          style={{ transform: `scale(${scale})` }}
          loading="lazy"
          decoding="async"
          onLoad={handleImageLoad}
          onError={() => setFailedImageUrl(can.image_url)}
        />
      ) : (
        <div role="img" aria-label={`Photo indisponible pour ${can.name}`} className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 p-2 text-center">
          <CanPlaceholder className="h-12 w-9 text-slate-500" />
          <span className="mt-2 text-[10px] font-semibold text-muted-foreground">Photo indisponible</span>
          {brandName && <span className="mt-1 text-[9px] text-muted-foreground">{brandName}</span>}
        </div>
      )}
      {(showLock ?? missing) && (
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
