import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAddCan, useCatalog, type Can } from "@/lib/data";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a can — Cansdex" },
      { name: "description", content: "Point your camera at a can barcode to add it to your collection." },
      { property: "og:title", content: "Scan a can — Cansdex" },
      { property: "og:description", content: "Point your camera at a can barcode to add it to your collection." },
    ],
  }),
  component: Scan,
});

function Scan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { data } = useCatalog();
  const addCan = useAddCan();
  const [found, setFound] = useState<{ can: Can; isNew: boolean } | null>(null);
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState(false);
  const busy = useRef(false);
  const catalogRef = useRef(data);
  catalogRef.current = data;

  const handle = async (code: string) => {
    if (busy.current || !catalogRef.current) return;
    busy.current = true;
    const can = catalogRef.current.cans.find((c) => c.barcode === code.trim());
    if (!can) {
      toast.error(`Unknown barcode ${code}`);
      setTimeout(() => (busy.current = false), 2000);
      return;
    }
    try {
      const isNew = await addCan(can.id);
      navigator.vibrate?.(80);
      setFound({ can, isNew });
    } catch (e) {
      toast.error((e as Error).message);
      busy.current = false;
    }
  };

  useEffect(() => {
    if (found) return;
    let controls: { stop: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (res) => {
          if (res) handle(res.getText());
        });
      } catch {
        setCamError(true);
      }
    })();
    return () => { cancelled = true; controls?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  if (found) {
    const brand = data?.brands.find((b) => b.id === found.can.brand_id);
    return (
      <div className="pt-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{found.isNew ? "New can unlocked!" : "Duplicate added"}</p>
        <div className="mx-auto my-8 w-32 animate-pop-in"><CanArt can={found.can} brandName={brand?.name} /></div>
        <h1 className="text-2xl font-black">{found.can.name}</h1>
        <p className="text-muted-foreground">{brand?.name} · {found.can.release_year}</p>
        <div className="mt-8 flex gap-3">
          <Link to="/cans/$id" params={{ id: found.can.id }} className="flex-1"><Button variant="secondary" className="h-12 w-full rounded-xl">View details</Button></Link>
          <Button className="h-12 flex-1 rounded-xl font-bold" onClick={() => { busy.current = false; setFound(null); }}>Scan another</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black">Scan</h1>
      <p className="text-sm text-muted-foreground">Point at the barcode on the can.</p>
      <div className="relative mt-5 aspect-[3/4] overflow-hidden rounded-3xl border bg-card">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {camError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">Camera unavailable. Enter the barcode below.</div>
        ) : (
          <>
            <div className="absolute inset-[12%] rounded-2xl border-2 border-primary/70" />
            <div className="absolute inset-x-[14%] h-0.5 bg-primary shadow-glow animate-scan-line" />
          </>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); handle(manual); }} className="mt-4 flex gap-2">
        <Input inputMode="numeric" placeholder="Enter barcode manually" value={manual} onChange={(e) => setManual(e.target.value)} className="h-12 rounded-xl" />
        <Button type="submit" className="h-12 rounded-xl font-bold">Add</Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">Try: 5060337500401 (Monster Original)</p>
    </div>
  );
}
