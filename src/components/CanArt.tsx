import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanPlaceholder } from "@/components/CanPlaceholder";
import type { Can } from "@/lib/data";

/** Artwork de canette ou cadenas opaque pour les pièces encore à débloquer. */
export function CanArt({ can, brandName, brandColor, missing, showLock, className }: {
  can: Can;
  brandName?: string | undefined;
  brandColor?: string | undefined;
  missing?: boolean | undefined;
  showLock?: boolean | undefined;
  className?: string | undefined;
}) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<{ source: string; scale: number } | null>(null);
  const showPhoto = Boolean(!missing && can.image_url && failedImageUrl !== can.image_url);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!can.image_url || imageScale?.source === can.image_url) return;
    const image = event.currentTarget;
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    const scale = Math.min(1.8, Math.max(1, aspectRatio / 0.32));
    setImageScale({ source: can.image_url, scale });
  };

  const scale = imageScale?.source === can.image_url ? imageScale.scale : 1;
  const locked = Boolean(missing || showLock);

  return (
    <div className={cn("relative mx-auto aspect-[1/1.9] w-full max-w-[120px] overflow-visible transition-all duration-300", className)}>
      {missing ? (
        <div
          role="img"
          aria-label={`Canette ${can.name} verrouillée`}
          title="Ajoute cette canette à ton mur pour la débloquer"
          className="flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] shadow-[0_12px_28px_rgba(20,20,30,.16)]"
          style={{ background: `linear-gradient(145deg, ${brandColor || "#7657ff"}, ${brandColor || "#7657ff"} 42%, #171923)` }}
        >
          <LockKeyhole className="h-12 w-12 text-white drop-shadow-[0_3px_8px_rgba(0,0,0,.28)]" strokeWidth={2.8} aria-hidden="true" />
        </div>
      ) : showPhoto ? (
        <img
          src={can.image_url ?? undefined}
          alt={can.name}
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300"
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
      {showLock && !missing && (
        <span className="absolute -right-1 -top-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#171923] text-white shadow-lg" aria-label="Canette non possédée">
          <LockKeyhole className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
      )}
      {locked && <span className="sr-only">Canette non possédée</span>}
    </div>
  );
}
