import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ScanBarcode } from "lucide-react";
import { useAddCan, useCatalog, type Can } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CanArt } from "@/components/CanArt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [
    { title: "Scanner une canette — Cansdex" },
    { name: "description", content: "Retrouve une canette par code-barres ou propose une canette absente du catalogue." },
    { property: "og:title", content: "Scanner une canette — Cansdex" },
    { property: "og:description", content: "Retrouve une canette par code-barres ou propose une canette absente du catalogue." },
  ] }),
  component: Scanner,
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
type ProposalImages = { front: File | null; back: File | null; barcode: File | null };

function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);
  const { data } = useCatalog();
  const { user } = useAuth();
  const addCan = useAddCan();
  const [found, setFound] = useState<{ can: Can; isNew: boolean } | null>(null);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [unknownBarcode, setUnknownBarcode] = useState("");
  const [directProposal, setDirectProposal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [flavour, setFlavour] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [category, setCategory] = useState<"Energy Drink" | "Soda" | "Soft Drink" | "Limited Edition">("Energy Drink");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ProposalImages>({ front: null, back: null, barcode: null });
  const catalogRef = useRef(data);
  catalogRef.current = data;

  const resetProposal = () => {
    setUnknownBarcode(""); setDirectProposal(false); setSubmitted(false);
    setName(""); setBrandId(""); setNewBrandName(""); setFlavour("");
    setReleaseYear(""); setCategory("Energy Drink"); setDescription("");
    setImages({ front: null, back: null, barcode: null });
    setManual(""); busy.current = false;
  };

  const handleBarcode = async (rawCode: string, source: "camera" | "manual" = "camera") => {
    const code = rawCode.trim().replace(/\D/g, "").slice(0, 14);
    if (!code || busy.current || !catalogRef.current) return;
    busy.current = true;
    const can = catalogRef.current.cans.find((item) => item.barcode === code);
    if (can && source !== "camera") {
      toast.error("Scanne le code-barres avec la caméra pour débloquer cette canette pour la première fois.");
      busy.current = false;
      return;
    }
    if (!can) {
      setUnknownBarcode(code);
      setManual(code);
      setDirectProposal(false);
      busy.current = false;
      return;
    }
    try {
      const isNew = await addCan(can.id);
      navigator.vibrate?.(80);
      setFound({ can, isNew });
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’ajouter cette canette.");
      busy.current = false;
    }
  };

  useEffect(() => {
    if (found || unknownBarcode || directProposal || submitted) return;
    let controls: { stop: () => void } | undefined;
    let cancelled = false;
    setCameraError(false);
    void (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const video = videoRef.current;
        if (cancelled || !video) return;
        const started = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => { if (result) void handleBarcode(result.getText()); },
        );
        if (cancelled) started.stop();
        else {
          controls = started;
          video.setAttribute("playsinline", "true");
          void video.play().catch(() => setCameraError(true));
        }
      } catch (error) {
        console.error("Impossible de démarrer le lecteur de code-barres :", error);
        if (!cancelled) setCameraError(true);
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // Scanner lifecycle is controlled by the page state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, unknownBarcode, directProposal, submitted, cameraAttempt]);

  const chooseImage = (key: keyof ProposalImages, file?: File) => {
    if (!file) { setImages((current) => ({ ...current, [key]: null })); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choisis une image JPG, PNG ou WebP."); return;
    }
    if (file.size > MAX_IMAGE_BYTES) { toast.error("Chaque photo doit faire 8 Mo maximum."); return; }
    setImages((current) => ({ ...current, [key]: file }));
  };

  const uploadImage = async (file: File, kind: string) => {
    if (!user) throw new Error("Connecte-toi pour proposer une canette.");
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}-${kind}.${extension}`;
    const { error } = await supabase.storage.from("can-submissions").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return supabase.storage.from("can-submissions").getPublicUrl(path).data.publicUrl;
  };

  const submitProposal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) { toast.error("Connecte-toi pour proposer une canette."); return; }
    if (!/^\d{8,14}$/.test(unknownBarcode)) { toast.error("Saisis un code-barres de 8 à 14 chiffres."); return; }
    if (!images.front) { toast.error("Ajoute une photo de la face avant."); return; }
    if (!brandId && newBrandName.trim().length < 2) { toast.error("Choisis une marque ou indique son nom."); return; }
    if (catalogRef.current?.cans.some((can) => can.barcode === unknownBarcode)) {
      toast.error("Ce code-barres existe déjà dans le catalogue."); return;
    }
    setIsSubmitting(true);
    try {
      const imageUrl = await uploadImage(images.front, "front");
      const backImageUrl = images.back ? await uploadImage(images.back, "back") : null;
      const barcodeImageUrl = images.barcode ? await uploadImage(images.barcode, "barcode") : null;
      const { error } = await supabase.from("can_submissions").insert({
        submitted_by: user.id, barcode: unknownBarcode, name: name.trim(),
        brand_id: brandId || null, proposed_brand_name: brandId ? null : newBrandName.trim(),
        flavour: flavour.trim() || null, release_year: releaseYear ? Number(releaseYear) : null,
        category, description: description.trim() || null, image_url: imageUrl,
        back_image_url: backImageUrl, barcode_image_url: barcodeImageUrl,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Une proposition pour ce code-barres est déjà en attente.");
        throw error;
      }
      setSubmitted(true);
      toast.success("Proposition envoyée pour vérification.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’envoyer la proposition.");
    } finally { setIsSubmitting(false); }
  };

  if (found) {
    const brand = data?.brands.find((item) => item.id === found.can.brand_id);
    return <div className="pt-6 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{found.isNew ? "Nouvelle canette débloquée !" : "Déjà débloquée · quantité inchangée"}</p>
      <div className="mx-auto my-8 w-32 animate-pop-in"><CanArt can={found.can} brandName={brand?.name} /></div>
      <h1 className="text-2xl font-black">{found.can.name}</h1>
      <p className="text-muted-foreground">{brand?.name} · {found.can.release_year ?? "Année inconnue"}</p>
      <div className="mt-8 flex gap-3">
        <Link to="/cans/$id" params={{ id: found.can.id }} className="flex-1"><Button variant="secondary" className="h-12 w-full rounded-xl">Voir la fiche</Button></Link>
        <Button className="h-12 flex-1 rounded-xl font-bold" onClick={() => { setFound(null); setCameraAttempt((n) => n + 1); busy.current = false; }}>Scanner une autre</Button>
      </div>
    </div>;
  }

  if (submitted) return <div className="py-12 text-center">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">✓</div>
    <h1 className="mt-5 text-2xl font-black">Proposition envoyée</h1>
    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Merci ! La canette sera ajoutée au catalogue après vérification.</p>
    <Button className="mt-8 h-12 rounded-xl font-bold" onClick={() => { resetProposal(); setCameraAttempt((n) => n + 1); }}>Scanner une autre canette</Button>
  </div>;

  if (unknownBarcode || directProposal) return <div className="space-y-4">
    <button type="button" onClick={() => { resetProposal(); setCameraAttempt((n) => n + 1); }} className="text-sm font-semibold text-muted-foreground">← Retour au scanner</button>
    <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Contribution communautaire</p><h1 className="mt-1 text-2xl font-black">Proposer une canette</h1><p className="mt-1 text-sm text-muted-foreground">Renseigne le code-barres et les informations disponibles. La proposition sera vérifiée avant publication.</p></div>
    <form onSubmit={submitProposal} className="space-y-4">
      <div className="space-y-1.5"><label htmlFor="proposal-barcode" className="text-sm font-semibold">Code-barres *</label><Input id="proposal-barcode" required inputMode="numeric" maxLength={14} value={unknownBarcode} onChange={(e) => setUnknownBarcode(e.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="8 à 14 chiffres" className="h-12 rounded-xl" /></div>
      <div className="space-y-1.5"><label htmlFor="proposal-name" className="text-sm font-semibold">Nom de la canette *</label><Input id="proposal-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Monster Ultra Violet" className="h-12 rounded-xl" /></div>
      <div className="space-y-1.5"><label htmlFor="proposal-brand" className="text-sm font-semibold">Marque *</label><select id="proposal-brand" value={brandId} onChange={(e) => { setBrandId(e.target.value); setNewBrandName(""); }} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="">Proposer une nouvelle marque…</option>{data?.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>{!brandId && <Input required minLength={2} maxLength={100} value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="Nom de la nouvelle marque" className="h-12 rounded-xl" />}</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><label htmlFor="proposal-flavour" className="text-sm font-semibold">Saveur</label><Input id="proposal-flavour" maxLength={100} value={flavour} onChange={(e) => setFlavour(e.target.value)} placeholder="Facultatif" className="h-12 rounded-xl" /></div>
        <div className="space-y-1.5"><label htmlFor="proposal-year" className="text-sm font-semibold">Année de sortie</label><Input id="proposal-year" type="number" min={1900} max={new Date().getFullYear() + 2} value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="Facultatif" className="h-12 rounded-xl" /></div>
      </div>
      <div className="space-y-1.5"><label htmlFor="proposal-category" className="text-sm font-semibold">Catégorie</label><select id="proposal-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="Energy Drink">Boisson énergisante</option><option value="Soda">Soda</option><option value="Soft Drink">Boisson sans alcool</option><option value="Limited Edition">Édition limitée</option></select></div>
      <div className="space-y-1.5"><label htmlFor="proposal-description" className="text-sm font-semibold">Informations complémentaires</label><textarea id="proposal-description" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails utiles pour identifier la canette…" rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" /></div>
      <div className="space-y-3 rounded-2xl border bg-card p-4"><div><h2 className="font-bold">Photos</h2><p className="text-xs text-muted-foreground">Photo de face obligatoire ; dos et code-barres facultatifs. JPG, PNG ou WebP, 8 Mo maximum par photo.</p></div>
        {([["front", "Face avant *", true], ["back", "Dos (facultatif)", false], ["barcode", "Gros plan du code-barres (facultatif)", false]] as const).map(([key, label, required]) => <div key={key} className="space-y-2"><label className="text-sm font-medium">{label}</label><div className="flex flex-wrap gap-2"><label htmlFor={`camera-photo-${key}`} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">Prendre une photo</label><input id={`camera-photo-${key}`} type="file" accept="image/*" capture="environment" onChange={(e) => { chooseImage(key, e.target.files?.[0]); e.currentTarget.value = ""; }} className="sr-only" /><label htmlFor={`photo-${key}`} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border bg-background px-3 text-sm font-semibold">Choisir dans la galerie</label><input id={`photo-${key}`} type="file" accept="image/jpeg,image/png,image/webp" required={required} onChange={(e) => { chooseImage(key, e.target.files?.[0]); e.currentTarget.value = ""; }} className="sr-only" /></div>{images[key] && <p className="break-all text-xs text-primary">{images[key]?.name}</p>}</div>)}
      </div>
      <Button type="submit" disabled={isSubmitting || !user} className="h-12 w-full rounded-xl font-bold">{isSubmitting ? "Envoi…" : "Envoyer pour vérification"}</Button>
      {!user && <p className="text-center text-xs text-muted-foreground">Connecte-toi pour proposer une canette.</p>}
    </form>
  </div>;

  return <div>
    <Button type="button" variant="ghost" className="-ml-3 mb-2 rounded-xl" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.assign("/"); }}>← Retour</Button>
    <h1 className="text-2xl font-black">Scanner une canette</h1>
    <p className="mt-1 text-sm text-muted-foreground">Scanne le code-barres pour retrouver une canette dans le catalogue.</p>
    <div className="relative mt-5 aspect-[3/4] overflow-hidden rounded-3xl border bg-card">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {cameraError ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground"><ScanBarcode className="h-8 w-8" /><p>Caméra indisponible. Vérifie les autorisations du navigateur et utilise Cansdex en HTTPS.</p><Button type="button" variant="secondary" className="rounded-xl" onClick={() => { setCameraError(false); setCameraAttempt((n) => n + 1); }}>Réessayer la caméra</Button></div> : <><div className="absolute inset-[12%] rounded-2xl border-2 border-primary/70" /><div className="absolute inset-x-[14%] h-0.5 bg-primary shadow-glow animate-scan-line" /></>}
    </div>
    <form onSubmit={(e) => { e.preventDefault(); void handleBarcode(manual, "manual"); }} className="mt-4 flex gap-2"><Input inputMode="numeric" placeholder="Saisir le code-barres manuellement" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, "").slice(0, 14))} className="h-12 rounded-xl" /><Button type="submit" className="h-12 rounded-xl font-bold">Rechercher</Button></form>
    <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-xl font-semibold" onClick={() => { setUnknownBarcode(""); setDirectProposal(true); setName(""); setBrandId(""); setNewBrandName(""); setImages({ front: null, back: null, barcode: null }); }}>＋ Ajouter une canette inexistante</Button>
    <p className="mt-3 text-xs text-muted-foreground">Si le code-barres est inconnu, tu pourras proposer la canette à la communauté.</p>
  </div>;
}
