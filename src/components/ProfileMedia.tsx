import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Wraps an avatar so clicking it opens the photo full size. */
export function AvatarZoom({ src, alt, children, className }: { src: string | null | undefined; alt: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return <div className={className}>{children}</div>;
  return <>
    <button type="button" onClick={() => setOpen(true)} className={`${className ?? ""} cursor-zoom-in`} aria-label={`Voir ${alt} en grand`}>{children}</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <img src={src} alt={alt} className="max-h-[80vh] w-full rounded-3xl object-contain" />
      </DialogContent>
    </Dialog>
  </>;
}

/** Profile banner with a wide fade into the page background at the bottom. */
export function ProfileBanner({ src, children }: { src: string | null | undefined; children?: ReactNode }) {
  return <div className="relative -mx-4 -mt-4 h-44 overflow-hidden bg-gradient-to-br from-primary/40 to-primary/5">
    {src && <img src={src} alt="" className="h-full w-full object-cover" />}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-b from-transparent via-background/60 to-background" />
    {children}
  </div>;
}
