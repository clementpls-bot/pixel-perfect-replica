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
      { title: "Scanner — Cansdex" },
      { name: "description", content: "Pointez votre caméra vers le code-barres d’une canette pour l’ajouter à votre collection." },
      { property: "og:title", content: "Scanner — Cansdex" },
      { property: "og:description", content: "Pointez votre caméra vers le code-barres d’une canette pour l’ajouter à votre collection." },
    ],
  }),
  component: Scanner,
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
type SubmissionImages = { front: File | null; back: File | null; barcode: File | null };

function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { data } = useCatalog();
  const { user } = useAuth();
  const addCan = useAddCan();
  const [found, setFound] = useState<{ can: Can; isNew: boolean } | null>(null);
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
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
    setCamError(false);
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const video = videoRef.current;
        if (cancelled || !video) return;
        // Prefer the rear camera on phones; allow browser fallback on laptops.
        const started = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            if (result) void handle(result.getText());
          },
        );
        if (cancelled) started.stop();
        else {
          controls = started;
          video.setAttribute("playsinline", "true");
          void video.play().catch(() => setCamError(true));
        }
      } catch (error) {
        console.error("Impossible de démarrer la caméra pour lire le code-barres :", error);
        if (!cancelled) setCamError(true);
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, unknownBarcode, submitted, cameraAttempt]);

  const chooseImage = (key: keyof SubmissionImages, file?: File) => {
    if (!file) {
      setImages((current) => ({ ...current, [key]: null }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choisis un fichier image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Chaque photo doit faire 8 Mo maximum.");
      return;
    }
    setImages((current) => ({ ...current, [key]: file }));
  };

  const uploadImage = async (file: File, kind: string) => {
    if (!user) throw new Error("Connecte-toi pour proposer une canette.");
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
      toast.error("Connecte-toi pour proposer une canette.");
      return;
    }
    if (!images.front) {
      toast.error("Ajoute une photo de la face avant de la canette.");
      return;
    }
    if (!/^\d{8,14}$/.test(unknownBarcode)) {
      toast.error("Vérifie le code-barres : saisis de 8 à 14 chiffres.");
      return;
    }
    if (catalogRef.current?.cans.some((can) => can.barcode === unknownBarcode)) {
      toast.error("Ce code-barres figure déjà dans le catalogue. Scanne-le à nouveau.");
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
        if (error.code === "23505") throw new Error("Une proposition pour ce code-barres est déjà en attente de vérification.");
        throw error;
      }
      setSubmitted(true);
      toast.success("Canette proposée pour vérification.");
    } catch (error) {
      toast.error((error as Error).message || "Impossible d’envoyer cette proposition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetScanner = () => {
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
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{found.isNew ? "Nouvelle canette débloquée !" : "Déjà débloquée · quantité inchangée"}</p>
        <div className="mx-auto my-8 w-32 animate-pop-in"><CanArt can={found.can} brandName={brand?.name} /></div>
        <h1 className="text-2xl font-black">{found.can.name}</h1>
        <p className="text-muted-foreground">{brand?.name} · {found.can.release_year}</p>
        <div className="mt-8 flex gap-3">
          <Link to="/cans/$id" params={{ id: found.can.id }} className="flex-1"><Button variant="secondary" className="h-12 w-full rounded-xl">Voir la fiche</Button></Link>
          <Button className="h-12 flex-1 rounded-xl font-bold" onClick={resetScanner}>Scanner une autre canette</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">✓</div>
        <h1 className="mt-5 text-2xl font-black">Proposition envoyée</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Merci de contribuer au catalogue Cansdex. Ta canette est en attente de vérification et ne sera publiée qu’après validation.</p>
        <Button className="mt-8 h-12 rounded-xl font-bold" onClick={resetScanner}>Scanner une autre canette</Button>
      </div>
    );
  }

  if (unknownBarcode) {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => { setUnknownBarcode(""); setManual(""); }} className="text-sm font-semibold text-muted-foreground">← Retour au scanner</button>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Contribution communautaire</p>
          <h1 className="mt-1 text-2xl font-black">Canette introuvable</h1>
          <p className="mt-1 text-sm text-muted-foreground">Le code-barres {unknownBarcode} ne figure pas dans le catalogue. Propose cette canette pour vérification.</p>
        </div>
        <form onSubmit={submitProposal} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="proposal-name" className="text-sm font-semibold">Nom de la canette *</label>
            <Input id="proposal-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Monster Ultra Violet" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-brand" className="text-sm font-semibold">Marque *</label>
            <select id="proposal-brand" required value={brandId} onChange={(e) => setBrandId(e.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="">Choisir une marque</option>
              {data?.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="proposal-flavour" className="text-sm font-semibold">Saveur</label>
              <Input id="proposal-flavour" maxLength={100} value={flavour} onChange={(e) => setFlavour(e.target.value)} placeholder="ex. raisin" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proposal-year" className="text-sm font-semibold">Année de sortie</label>
              <Input id="proposal-year" type="number" min={1900} max={new Date().getFullYear() + 2} value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="Facultatif" className="h-12 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-category" className="text-sm font-semibold">Catégorie *</label>
            <select id="proposal-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="Energy Drink">Boisson énergisante</option><option value="Soda">Soda</option><option value="Soft Drink">Boisson sans alcool</option><option value="Limited Edition">Édition limitée</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-description" className="text-sm font-semibold">Informations complémentaires</label>
            <textarea id="proposal-description" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Toute information permettant d’identifier cette canette…" rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <div>
              <h2 className="font-bold">Photos</h2>
              <p className="text-xs text-muted-foreground">La photo de face est obligatoire. Les photos du dos et du code-barres nous aident à vérifier la proposition. JPG, PNG ou WebP ; 8 Mo maximum par photo.</p>
            </div>
            {([
              ["front", "Face avant de la canette *", true],
              ["back", "Dos de la canette (facultatif)", false],
              ["barcode", "Gros plan du code-barres (facultatif)", false],
            ] as const).map(([key, label, required]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`photo-${key}`} className="text-sm font-medium">{label}</label>
                <input id={`photo-${key}`} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required={required} onChange={(e) => chooseImage(key, e.target.files?.[0])} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold file:text-secondary-foreground" />
                {images[key] && <p className="text-xs text-primary">{images[key]?.name}</p>}
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Chaque proposition est vérifiée avant publication. Les codes-barres en double et les propositions incomplètes ou inappropriées peuvent être refusés.</div>
          <Button type="submit" disabled={isSubmitting || !user} className="h-12 w-full rounded-xl font-bold">
            {isSubmitting ? "Envoi de la proposition…" : "Envoyer pour vérification"}
          </Button>
          {!user && <p className="text-center text-xs text-muted-foreground">Vous devez être connecté pour proposer une canette.</p>}
        </form>
      </div>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        className="-ml-3 mb-2 rounded-xl"
        onClick={() => {
          if (window.history.length > 1) window.history.back();
          else window.location.assign("/");
        }}
      >
        ← Retour
      </Button>
      <h1 className="text-2xl font-black">Scanner</h1>
      <p className="text-sm text-muted-foreground">Scanne le code-barres avec la caméra de ton téléphone pour débloquer une canette. La rescanner ne modifiera pas sa quantité.</p>
      <div className="relative mt-5 aspect-[3/4] overflow-hidden rounded-3xl border bg-card">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {camError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground"><p>Caméra indisponible. Vérifie les autorisations du navigateur et utilise Cansdex en HTTPS.</p><Button type="button" variant="secondary" className="rounded-xl" onClick={() => { setCamError(false); setCameraAttempt((n) => n + 1); }}>Réessayer la caméra</Button></div>
        ) : (
          <>
            <div className="absolute inset-[12%] rounded-2xl border-2 border-primary/70" />
            <div className="absolute inset-x-[14%] h-0.5 bg-primary shadow-glow animate-scan-line" />
          </>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void handle(manual); }} className="mt-4 flex gap-2">
        <Input inputMode="numeric" placeholder="Saisir le code-barres manuellement" value={manual} onChange={(e) => setManual(e.target.value)} className="h-12 rounded-xl" />
        <Button type="submit" className="h-12 rounded-xl font-bold">Ajouter</Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">Tu peux scanner le code-barres avec la caméra ou le saisir ici pour ajouter une canette déjà répertoriée. Si le code est absent du catalogue, tu pourras proposer la canette.</p>
    </div>
  );
}
