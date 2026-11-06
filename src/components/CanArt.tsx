import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Can } from "@/lib/data";

type ProcessedImage = {
  source: string;
  croppedUrl: string | null;
};

/**
 * Recadre une image autour de ses pixels visibles.
 * Le scan est réduit pour limiter le coût, puis le recadrage est appliqué
 * à la résolution originale. Les pixels transparents sont conservés.
 */
function cropTransparentMargins(image: HTMLImageElement): string | null {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return null;

  const scanScale = Math.min(1, 320 / Math.max(width, height));
  const scanWidth = Math.max(1, Math.round(width * scanScale));
  const scanHeight = Math.max(1, Math.round(height * scanScale));
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = scanWidth;
  scanCanvas.height = scanHeight;

  const scanContext = scanCanvas.getContext("2d", { willReadFrequently: true });
  if (!scanContext) return null;

  scanContext.drawImage(image, 0, 0, scanWidth, scanHeight);
  const pixels = scanContext.getImageData(0, 0, scanWidth, scanHeight).data;

  let minX = scanWidth;
  let minY = scanHeight;
  let maxX = -1;
  let maxY = -1;

  // Ignore les pixels presque transparents pour éviter les petits artefacts.
  const alphaThreshold = 16;
  for (let y = 0; y < scanHeight; y += 1) {
    for (let x = 0; x < scanWidth; x += 1) {
      const alpha = pixels[(y * scanWidth + x) * 4 + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  // Si l'image est déjà presque pleine, on la laisse telle quelle.
  const visibleWidth = maxX - minX + 1;
  const visibleHeight = maxY - minY + 1;
  if (visibleWidth >= scanWidth * 0.985 && visibleHeight >= scanHeight * 0.985) {
    return null;
  }

  // Ajoute une petite marge pour ne jamais couper le bord de la canette.
  const padX = Math.ceil(visibleWidth * 0.02);
  const padY = Math.ceil(visibleHeight * 0.02);
  const cropMinX = Math.max(0, minX - padX);
  const cropMinY = Math.max(0, minY - padY);
  const cropMaxX = Math.min(scanWidth - 1, maxX + padX);
  const cropMaxY = Math.min(scanHeight - 1, maxY + padY);

  const sourceX = Math.floor((cropMinX / scanWidth) * width);
  const sourceY = Math.floor((cropMinY / scanHeight) * height);
  const sourceRight = Math.min(width, Math.ceil(((cropMaxX + 1) / scanWidth) * width));
  const sourceBottom = Math.min(height, Math.ceil(((cropMaxY + 1) / scanHeight) * height));
  const cropWidth = sourceRight - sourceX;
  const cropHeight = sourceBottom - sourceY;

  if (cropWidth <= 0 || cropHeight <= 0) return null;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = cropWidth;
  outputCanvas.height = cropHeight;
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) return null;

  outputContext.drawImage(
    image,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return outputCanvas.toDataURL("image/webp", 0.94);
}

/** Affiche la photo d'origine sans filtre ; le cadenas reste discret dans un coin. */
export function CanArt({ can, brandName, missing, className }: { can: Can; brandName?: string | undefined; missing?: boolean | undefined; className?: string | undefined }) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const showPhoto = Boolean(can.image_url && failedImageUrl !== can.image_url);
  const displayImageUrl =
    processedImage?.source === can.image_url && processedImage.croppedUrl
      ? processedImage.croppedUrl
      : can.image_url;

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!can.image_url || processedImage?.source === can.image_url) return;

    try {
      const croppedUrl = cropTransparentMargins(event.currentTarget);
      setProcessedImage({ source: can.image_url, croppedUrl });
    } catch {
      // Si le navigateur bloque l'accès aux pixels (CORS, canvas), garde l'image originale.
      setProcessedImage({ source: can.image_url, croppedUrl: null });
    }
  };

  return (
    <div className={cn("relative mx-auto aspect-[1/1.9] w-full max-w-[120px] transition-all duration-300", className)}>
      {showPhoto ? (
        <img
          src={displayImageUrl!}
          alt={can.name}
          crossOrigin="anonymous"
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
          onLoad={handleImageLoad}
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
          className="can-lock-magic absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/90 text-violet-800 shadow-md ring-1 ring-white/80"
          aria-label="Canette non possédée"
          title="Ajoute cette canette à ton mur pour la débloquer"
        >
          <LockKeyhole className="h-3.5 w-3.5 drop-shadow-[0_0_3px_rgba(255,255,255,0.9)]" strokeWidth={2.2} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
