import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAddCan, useCatalog, type Can } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
type SubmissionImages = { front: File | null; back: File | null; barcode: File | null };

function Scan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { data } = useCatalog();
  const { user } = useAuth();
  const addCan = useAddCan();
  const [found, setFound] = useState<{ can: Can; isNew: boolean } | null>(null);
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [flavour, setFlavour] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [category, setCategory] = useState<"Energy Drink" | "Soda" | "Soft Drink" | "Limited Edition">("Energy Drink");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<SubmissionImages>({ front: null, back: null, barcode: null });
  const busy = useRef(false);
  const catalogRef = useRef(data);
  catalogRef.current = data;

  const handle = async (rawCode: string) => {
    const code = rawCode.trim();
    if (busy.current || !catalogRef.current || !code) return;
    busy.current = true;
    const can = catalogRef.current.cans.find((c) => c.barcode === code);
    if (!can) {
      setUnknownBarcode(code);
      setManual(code);
      busy.current = false;
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
    if (found || unknownBarcode || submitted) return;
    let controls: { stop: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (res) => {
          if (res) void handle(res.getText());
        });
      } catch {
        setCamError(true);
      }
    })();
    return () => { cancelled = true; controls?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, unknownBarcode, submitted]);

  const chooseImage = (key: keyof SubmissionImages, file?: File) => {
    if (!file) {
      setImages((current) => ({ ...current, [key]: null }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Each photo must be 8 MB or smaller.");
      return;
    }
    setImages((current) => ({ ...current, [key]: file }));
  };

  const uploadImage = async (file: File, kind: string) => {
    if (!user) throw new Error("Sign in to submit a can.");
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}-${kind}.${extension}`;
    const { error } = await supabase.storage.from("can-submissions").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return supabase.storage.from("can-submissions").getPublicUrl(path).data.publicUrl;
  };

  const submitProposal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast.error("Sign in to submit a can.");
      return;
    }
    if (!images.front) {
      toast.error("Add a photo of the front of the can.");
      return;
    }
    if (!/^\d{8,14}$/.test(unknownBarcode)) {
      toast.error("Check the barcode: enter 8 to 14 digits.");
      return;
    }
    if (catalogRef.current?.cans.some((can) => can.barcode === unknownBarcode)) {
      toast.error("This barcode is already in the catalogue. Scan it again.");
      setUnknownBarcode("");
      return;
    }
    setIsSubmitting(true);
    try {
      const frontUrl = await uploadImage(images.front, "front");
      const backUrl = images.back ? await uploadImage(images.back, "back") : null;
      const barcodeUrl = images.barcode ? await uploadImage(images.barcode, "barcode") : null;
      const { error } = await supabase.from("can_submissions").insert({
        submitted_by: user.id,
        barcode: unknownBarcode,
        name: name.trim(),
        brand_id: brandId,
        flavour: flavour.trim() || null,
        release_year: releaseYear ? Number(releaseYear) : null,
        category,
        description: description.trim() || null,
        image_url: frontUrl,
        back_image_url: backUrl,
        barcode_image_url: barcodeUrl,
      });
      if (error) {
        if (error.code === "23505") throw new Error("A proposal for this barcode is already awaiting review.");
        throw error;
      }
      setSubmitted(true);
      toast.success("Can submitted for review.");
    } catch (error) {
      toast.error((error as Error).message || "Unable to submit this can.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetScan = () => {
    busy.current = false;
    setFound(null);
    setUnknownBarcode("");
    setSubmitted(false);
    setManual("");
    setName("");
    setBrandId("");
    setFlavour("");
    setReleaseYear("");
    setDescription("");
    setImages({ front: null, back: null, barcode: null });
  };

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
          <Button className="h-12 flex-1 rounded-xl font-bold" onClick={resetScan}>Scan another</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">✓</div>
        <h1 className="mt-5 text-2xl font-black">Proposal sent</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Thanks for helping grow the Cansdex catalogue. Your can is pending review and will not appear in the official catalogue until approved.</p>
        <Button className="mt-8 h-12 rounded-xl font-bold" onClick={resetScan}>Scan another can</Button>
      </div>
    );
  }

  if (unknownBarcode) {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => { setUnknownBarcode(""); setManual(""); }} className="text-sm font-semibold text-muted-foreground">← Back to scanner</button>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Community contribution</p>
          <h1 className="mt-1 text-2xl font-black">Can not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">Barcode {unknownBarcode} is not in the catalogue. Submit its details for review.</p>
        </div>
        <form onSubmit={submitProposal} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="proposal-name" className="text-sm font-semibold">Can name *</label>
            <Input id="proposal-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monster Ultra Violet" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-brand" className="text-sm font-semibold">Brand *</label>
            <select id="proposal-brand" required value={brandId} onChange={(e) => setBrandId(e.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="">Choose a brand</option>
              {data?.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="proposal-flavour" className="text-sm font-semibold">Flavour</label>
              <Input id="proposal-flavour" maxLength={100} value={flavour} onChange={(e) => setFlavour(e.target.value)} placeholder="e.g. Grape" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proposal-year" className="text-sm font-semibold">Release year</label>
              <Input id="proposal-year" type="number" min={1900} max={new Date().getFullYear() + 2} value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="Optional" className="h-12 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-category" className="text-sm font-semibold">Category *</label>
            <select id="proposal-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option>Energy Drink</option><option>Soda</option><option>Soft Drink</option><option>Limited Edition</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-description" className="text-sm font-semibold">Extra details</label>
            <textarea id="proposal-description" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anything that helps identify this can…" rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <div>
              <h2 className="font-bold">Photos</h2>
              <p className="text-xs text-muted-foreground">Front photo required. Back and barcode photos help us verify the submission. JPG, PNG or WebP; max 8 MB each.</p>
            </div>
            {([
              ["front", "Front of the can *", true],
              ["back", "Back of the can (optional)", false],
              ["barcode", "Close-up of barcode (optional)", false],
            ] as const).map(([key, label, required]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`photo-${key}`} className="text-sm font-medium">{label}</label>
                <input id={`photo-${key}`} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required={required} onChange={(e) => chooseImage(key, e.target.files?.[0])} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold file:text-secondary-foreground" />
                {images[key] && <p className="text-xs text-primary">{images[key]?.name}</p>}
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Submissions are checked before publication. Duplicate barcodes and incomplete or inappropriate submissions may be rejected.</div>
          <Button type="submit" disabled={isSubmitting || !user} className="h-12 w-full rounded-xl font-bold">
            {isSubmitting ? "Sending proposal…" : "Submit for review"}
          </Button>
          {!user && <p className="text-center text-xs text-muted-foreground">You must be signed in to contribute a can.</p>}
        </form>
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
      <form onSubmit={(e) => { e.preventDefault(); void handle(manual); }} className="mt-4 flex gap-2">
        <Input inputMode="numeric" placeholder="Enter barcode manually" value={manual} onChange={(e) => setManual(e.target.value)} className="h-12 rounded-xl" />
        <Button type="submit" className="h-12 rounded-xl font-bold">Add</Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">Try: 5060337500401 (Monster Original)</p>
    </div>
  );
}
