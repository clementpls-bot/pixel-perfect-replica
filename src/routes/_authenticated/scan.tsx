import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAddCan, useCatalog, type Can } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CanArt } from "@/components/CanArt";
import { recognizeCanImage } from "@/lib/can-vision";
import { Sparkles, ScanBarcode, ImagePlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Reconnaissance de canettes — Cansdex" },
      { name: "description", content: "Identifie une canette par code-barres." },
      { property: "og:title", content: "Reconnaissance de canettes — Cansdex" },
      { property: "og:description", content: "Identifie une canette par reconnaissance visuelle IA ou par code-barres." },
    ],
  }),
  component: Scanner,
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
type SubmissionImages = { front: File | null; back: File | null; barcode: File | null };
type VisionResult = Awaited<ReturnType<typeof recognizeCanImage>>;

function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const visionVideoRef = useRef<HTMLVideoElement>(null);
  const { data } = useCatalog();
  const { user } = useAuth();
  const addCan = useAddCan();
  const [found, setFound] = useState<{ can: Can; isNew: boolean } | null>(null);
  const [barcodeMatches, setBarcodeMatches] = useState<Can[]>([]);
  const [scanMode, setScanMode] = useState<"vision" | "barcode">("barcode");
  const [visionBusy, setVisionBusy] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null);
  const [visionError, setVisionError] = useState("");
  const [visionCameraError, setVisionCameraError] = useState(false);
  const [unknownVisual, setUnknownVisual] = useState(false);
  const [directProposal, setDirectProposal] = useState(false);
  const [proposedBrandName, setProposedBrandName] = useState("");
  const [newBrandSelected, setNewBrandSelected] = useState(false);
  const [selectedVisionCanId, setSelectedVisionCanId] = useState("");
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
  const [historicalContext, setHistoricalContext] = useState("");
  const [colorPrimary, setColorPrimary] = useState("#222222");
  const [colorSecondary, setColorSecondary] = useState("#ffffff");
  const [tabColor, setTabColor] = useState("");
  const [caffeine, setCaffeine] = useState("");
  const [sugar, setSugar] = useState("");
  const [taurine, setTaurine] = useState("");
  const [energy, setEnergy] = useState("");
  const [historyVerified, setHistoryVerified] = useState(false);
  const [notes, setNotes] = useState("");
  const [modelId, setModelId] = useState("");
  const [variantName, setVariantName] = useState("");
  const [region, setRegion] = useState("");
  const [editionType, setEditionType] = useState("standard");
  const [volumeMl, setVolumeMl] = useState("");
  const [images, setImages] = useState<SubmissionImages>({ front: null, back: null, barcode: null });
  const busy = useRef(false);
  const catalogRef = useRef(data);
  catalogRef.current = data;

  const handle = async (rawCode: string) => {
    const code = rawCode.trim();
    if (busy.current || !catalogRef.current || !code) return;
    busy.current = true;
    const matches = catalogRef.current.cans.filter((c) => c.barcode === code);
    if (matches.length === 0) {
      setUnknownBarcode(code);
      setManual(code);
      busy.current = false;
      return;
    }
    if (matches.length > 1) {
      setManual(code);
      setBarcodeMatches(matches);
      busy.current = false;
      return;
    }
    try {
      const can = matches[0];
      const isNew = await addCan(can.id);
      navigator.vibrate?.(80);
      setFound({ can, isNew });
    } catch (e) {
      toast.error((e as Error).message);
      busy.current = false;
    }
  };

  useEffect(() => {
    if (scanMode !== "barcode" || found || barcodeMatches.length > 1 || unknownBarcode || submitted || visionResult) return;
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
  }, [found, barcodeMatches, unknownBarcode, submitted, cameraAttempt, scanMode, visionResult]);

  useEffect(() => {
    if (scanMode !== "vision" || found || submitted || unknownVisual || visionResult || visionBusy) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setVisionCameraError(false);
    if (!navigator.mediaDevices?.getUserMedia) { setVisionCameraError(true); return; }
    void navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } })
      .then((media) => {
        if (cancelled) { media.getTracks().forEach((track) => track.stop()); return; }
        stream = media;
        if (visionVideoRef.current) { visionVideoRef.current.srcObject = media; void visionVideoRef.current.play().catch(() => setVisionCameraError(true)); }
      })
      .catch(() => { if (!cancelled) setVisionCameraError(true); });
    return () => { cancelled = true; stream?.getTracks().forEach((track) => track.stop()); if (visionVideoRef.current) visionVideoRef.current.srcObject = null; };
  }, [scanMode, found, submitted, unknownVisual, visionResult, visionBusy, cameraAttempt]);

  const captureVisionPhoto = async () => {
    const video = visionVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setVisionCameraError(true); return; }
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext("2d"); if (!context) { setVisionError("Impossible de capturer la photo."); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (blob) await analyzeVisionImage(new File([blob], "canette.jpg", { type: "image/jpeg" }));
  };
  const analyzeVisionImage = async (file: File) => {
    setVisionBusy(true); setVisionError(""); setVisionResult(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choisis une photo au format image.");
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Impossible de préparer cette image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Impossible de compresser la photo.")), "image/jpeg", 0.82));
      const compressed = new File([blob], "cansdex-scan.jpg", { type: "image/jpeg" });
      const imageDataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Impossible de lire la photo.")); reader.onerror = () => reject(new Error("Impossible de lire la photo.")); reader.readAsDataURL(compressed); });
      setImages((current) => ({ ...current, front: compressed }));
      const result = await recognizeCanImage({ data: { imageDataUrl } });
      setVisionResult(result); setSelectedVisionCanId(result.candidates[0]?.id ?? "");
    } catch (error) { const message = (error as Error).message || "Impossible d’analyser cette photo."; setVisionError((error as Error).name === "AbortError" ? "L’analyse prend trop de temps. Vérifie ta connexion puis réessaie." : message); toast.error((error as Error).name === "AbortError" ? "L’analyse prend trop de temps. Réessaie." : message); }
    finally { setVisionBusy(false); }
  };

  const startUnknownCanProposal = () => {
    const vision = visionResult?.vision; if (!vision) return;
    const matchedBrand = data?.brands.find((brand) => brand.name.toLowerCase() === (vision.brand_name ?? "").toLowerCase());
    setName(vision.model_name || vision.brand_name || ""); setFlavour(vision.model_name || "");
    setBrandId(matchedBrand?.id ?? ""); setProposedBrandName(matchedBrand ? "" : (vision.brand_name ?? "")); setNewBrandSelected(!matchedBrand); setModelId(""); setDescription(""); setImages((current) => ({ front: current.front, back: null, barcode: null }));
    setVariantName(vision.variant_name ?? ""); setRegion(vision.region ?? "");
    setEditionType((vision.edition_type ?? "standard").toLowerCase().includes("limit") ? "limited" : (vision.edition_type ?? "standard").toLowerCase().includes("collab") ? "collab" : (vision.edition_type ?? "standard").toLowerCase().includes("import") ? "import" : "standard");
    setVolumeMl(vision.volume_ml ? String(vision.volume_ml) : ""); setReleaseYear(vision.release_year ? String(vision.release_year) : "");
    setUnknownBarcode(""); setUnknownVisual(true); setVisionResult(null);
  };
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
    if (!brandId && (!newBrandSelected || proposedBrandName.trim().length < 2)) {
      toast.error("Choisis une marque ou propose son nom.");
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
        brand_id: brandId || null,
        proposed_brand_name: brandId || !newBrandSelected ? null : proposedBrandName.trim(),
        flavour: flavour.trim() || null,
        release_year: releaseYear ? Number(releaseYear) : null,
        category,
        description: description.trim() || null,
        historical_context: historicalContext.trim() || null,
        color_primary: colorPrimary.trim() || "#222222",
        color_secondary: colorSecondary.trim() || "#ffffff",
        tab_color: tabColor.trim() || null,
        caffeine_mg_per_100ml: caffeine ? Number(caffeine) : null,
        sugar_g_per_100ml: sugar ? Number(sugar) : null,
        taurine_mg_per_100ml: taurine ? Number(taurine) : null,
        energy_kcal_per_100ml: energy ? Number(energy) : null,
        history_verified: historyVerified,
        notes: notes.trim() || null,
        image_url: frontUrl,
        back_image_url: backUrl,
        barcode_image_url: barcodeUrl,
        model_id: modelId || null,
        variant_name: variantName.trim() || null,
        region: region.trim() || null,
        edition_type: editionType,
        volume_ml: volumeMl ? Number(volumeMl) : null,
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

  const chooseBarcodeCan = async (can: Can) => {
    try {
      const isNew = await addCan(can.id);
      navigator.vibrate?.(80);
      setBarcodeMatches([]);
      setFound({ can, isNew });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const resetScanner = () => {
    busy.current = false;
    setFound(null);
    setBarcodeMatches([]);
    setVisionResult(null);
    setVisionError("");
    setScanMode("barcode");
    setUnknownBarcode("");
    setSubmitted(false);
    setManual("");
    setName("");
    setBrandId("");
    setProposedBrandName("");
    setNewBrandSelected(false);
    setUnknownVisual(false);
    setDirectProposal(false);
    setFlavour("");
    setReleaseYear("");
    setDescription("");
    setHistoricalContext(""); setColorPrimary("#222222"); setColorSecondary("#ffffff"); setTabColor("");
    setCaffeine(""); setSugar(""); setTaurine(""); setEnergy(""); setHistoryVerified(false); setNotes("");
    setModelId(""); setVariantName(""); setRegion(""); setEditionType("standard"); setVolumeMl("");
    setImages({ front: null, back: null, barcode: null });
  };

  if (barcodeMatches.length > 1) {
    return (
      <div className="space-y-5 pt-6">
        <button type="button" onClick={() => { setBarcodeMatches([]); setCameraAttempt((n) => n + 1); }} className="text-sm font-semibold text-muted-foreground">← Reprendre le scan</button>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Code-barres partagé</p>
          <h1 className="mt-2 text-2xl font-black">Quelle canette est la bonne ?</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plusieurs canettes correspondent à ce code-barres. Choisis celle qui correspond exactement à ta canette avant de l’ajouter à ton coffre.</p>
        </div>
        <div className="space-y-3">
          {barcodeMatches.map((can) => {
            const brand = data?.brands.find((item) => item.id === can.brand_id);
            return (
              <button key={can.id} type="button" onClick={() => void chooseBarcodeCan(can)} className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5">
                <div className="w-16 shrink-0"><CanArt can={can} brandName={brand?.name} /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{can.name}</p>
                  <p className="text-sm text-muted-foreground">{brand?.name ?? "Marque inconnue"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{[can.variant_name, can.region, can.release_year, can.volume_ml ? `${can.volume_ml} ml` : null].filter(Boolean).join(" · ") || "Détails supplémentaires indisponibles"}</p>
                </div>
                <span className="text-sm font-bold text-primary">Choisir</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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

  if (visionResult) {
    const selected = visionResult.candidates.find((candidate) => candidate.id === selectedVisionCanId) ?? visionResult.candidates[0];
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => { setVisionResult(null); setVisionError(""); setCameraAttempt((n) => n + 1); }} className="text-sm font-semibold text-muted-foreground">← Reprendre une photo</button>
        <div className="rounded-3xl border bg-card p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Sparkles className="h-4 w-4" />Résultat de l’IA</div>
          <h1 className="mt-2 text-2xl font-black">{visionResult.vision.model_name || visionResult.vision.brand_name || "Canette identifiée"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{visionResult.vision.variant_name || visionResult.vision.edition_type || "Variante à confirmer"} · Confiance {Math.round(visionResult.vision.confidence * 100)}%</p>
          {visionResult.vision.visual_cues.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Indices visuels : {visionResult.vision.visual_cues.join(" · ")}</p>}
        </div>
        {visionResult.match_type !== "unknown" && visionResult.candidates.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-bold">{visionResult.match_type === "exact" ? "Variante reconnue" : "Laquelle possèdes-tu ?"}</h2>
            {visionResult.candidates.map((candidate) => {
              const brand = data?.brands.find((item) => item.id === candidate.brand_id);
              const active = candidate.id === (selected?.id ?? "");
              return <button key={candidate.id} type="button" onClick={() => setSelectedVisionCanId(candidate.id)} className={active ? "flex w-full items-center gap-3 rounded-2xl border-2 border-primary bg-primary/5 p-3 text-left" : "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left"}>
                <div className="w-14 shrink-0"><CanArt can={candidate as unknown as Can} brandName={brand?.name} /></div>
                <div className="min-w-0 flex-1"><p className="font-bold">{candidate.name}</p><p className="text-xs text-muted-foreground">{brand?.name} · {candidate.variant_name}</p><p className="text-xs text-muted-foreground">{candidate.region || "Région inconnue"} · {candidate.release_year || "Année inconnue"} · {candidate.volume_ml ? candidate.volume_ml + " ml" : "Format inconnu"}</p></div>
                {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </button>;
            })}
            <Button className="h-12 w-full rounded-xl font-bold" disabled={!selected || !user} onClick={async () => { if (!selected) return; try { const isNew = await addCan(selected.id); setFound({ can: selected as unknown as Can, isNew }); setVisionResult(null); } catch (error) { toast.error((error as Error).message); } }}>Ajouter à mon coffre</Button>
            {selected && <Link to="/cans/$id" params={{ id: selected.id }} className="block text-center text-sm font-semibold text-primary">Voir la fiche complète</Link>}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-5 text-center">
            <p className="font-bold">Aucune variante correspondante</p>
            <p className="mt-1 text-sm text-muted-foreground">Tu peux proposer cette canette à la communauté. Les informations de l’IA seront reprises dans le formulaire.</p>
            <Button className="mt-4 h-12 w-full rounded-xl font-bold" onClick={startUnknownCanProposal}>Proposer cette canette à la communauté</Button>
          </div>
        )}
        <Button variant="outline" className="w-full rounded-xl" onClick={() => { setVisionResult(null); setCameraAttempt((n) => n + 1); }}>Scanner une autre canette</Button>
      </div>
    );
  }
  if (unknownBarcode || unknownVisual || directProposal) {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => { setUnknownBarcode(""); setManual(""); setUnknownVisual(false); setDirectProposal(false); setProposedBrandName(""); setNewBrandSelected(false); }} className="text-sm font-semibold text-muted-foreground">← Retour au scanner</button>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{directProposal ? "Contribution communautaire" : unknownVisual ? "Nouvelle découverte" : "Contribution communautaire"}</p>
          <h1 className="text-2xl font-black tracking-tight">{directProposal ? "Ajouter une canette inexistante" : unknownVisual ? "Proposer cette canette" : "Canette introuvable"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{directProposal ? "Renseigne les informations de la canette et son code-barres. Ta proposition sera vérifiée avant publication." : unknownVisual ? "L’IA n’a pas trouvé de variante correspondante. Vérifie les informations préremplies et ajoute le code-barres." : `Le code-barres ${unknownBarcode} ne figure pas dans le catalogue. Propose cette canette pour vérification.`}</p>
        </div>
        <form onSubmit={submitProposal} className="space-y-6 rounded-2xl border bg-card p-4 sm:p-6">
          {unknownVisual && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3"><div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />Résultat de la reconnaissance IA</div><p className="mt-1 text-sm text-muted-foreground">Les champs sont préremplis à partir de la photo. Corrige-les si nécessaire ; la fiche restera en attente de validation.</p></div>}
          {(unknownVisual || directProposal) && <div className="space-y-1.5"><label htmlFor="proposal-barcode" className="text-sm font-semibold">Code-barres principal *</label><Input id="proposal-barcode" required inputMode="numeric" maxLength={14} value={unknownBarcode} onChange={(e) => setUnknownBarcode(e.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="8 à 14 chiffres" className="h-10 rounded-md" /></div>}
          <section className="space-y-4"><h2 className="border-b pb-2 text-base font-bold">Identification</h2>
          <div className="space-y-1.5">
            <label htmlFor="proposal-name" className="text-sm font-semibold">Nom de la canette *</label>
            <Input id="proposal-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Monster Ultra Violet" className="h-10 rounded-md" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-brand" className="text-sm font-semibold">Marque *</label>
            <select id="proposal-brand" required value={brandId || (newBrandSelected ? "__new__" : "")} onChange={(e) => { if (e.target.value === "__new__") { setBrandId(""); setNewBrandSelected(true); setModelId(""); } else { setBrandId(e.target.value); setNewBrandSelected(false); setProposedBrandName(""); setModelId(""); } }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Choisir une marque</option>
              {data?.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              <option value="__new__">＋ Proposer une nouvelle marque…</option>
            </select>
            {newBrandSelected && <div className="space-y-1.5"><label htmlFor="proposal-new-brand" className="text-sm font-medium">Nom de la nouvelle marque</label><Input id="proposal-new-brand" required={!brandId} maxLength={100} value={proposedBrandName} onChange={(e) => setProposedBrandName(e.target.value)} placeholder="Nom exact de la marque" className="h-10 rounded-md" /><p className="text-xs text-muted-foreground">La marque sera créée dans le catalogue uniquement si la proposition est validée.</p></div>}
          </div>
          {brandId && (
            <div className="space-y-1.5">
              <label htmlFor="proposal-model" className="text-sm font-semibold">Modèle</label>
              <select id="proposal-model" value={modelId} onChange={(e) => {
                setModelId(e.target.value);
                const m = data?.models.find((x) => x.id === e.target.value);
                if (m) { setName(m.name); if (m.flavour) setFlavour(m.flavour); }
              }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Nouveau modèle (utilise le nom ci-dessus)</option>
                {data?.models.filter((m) => m.brand_id === brandId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Si la saveur existe déjà, choisis-la : ta canette sera ajoutée comme nouveau design de ce modèle.</p>
            </div>
          )}
          </section>
          <section className="space-y-4"><h2 className="border-b pb-2 text-base font-bold">Modèle et design</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="proposal-variant" className="text-sm font-semibold">Nom du design</label>
              <Input id="proposal-variant" maxLength={120} value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="ex. Collab Call of Duty" className="h-10 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proposal-edition" className="text-sm font-semibold">Type d’édition</label>
              <select id="proposal-edition" value={editionType} onChange={(e) => setEditionType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="standard">Standard</option><option value="limited">Édition limitée</option><option value="collab">Collab</option><option value="import">Import</option><option value="redesign">Redesign</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proposal-region" className="text-sm font-semibold">Pays / région</label>
              <Input id="proposal-region" maxLength={60} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="ex. Japon" className="h-10 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proposal-volume" className="text-sm font-semibold">Contenance (ml)</label>
              <Input id="proposal-volume" type="number" min={50} max={2000} value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} placeholder="ex. 500" className="h-10 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="proposal-flavour" className="text-sm font-semibold">Saveur</label>
              <Input id="proposal-flavour" maxLength={100} value={flavour} onChange={(e) => setFlavour(e.target.value)} placeholder="ex. raisin" className="h-10 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="proposal-year" className="text-sm font-semibold">Année de sortie</label>
              <Input id="proposal-year" type="number" min={1900} max={new Date().getFullYear() + 2} value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="Facultatif" className="h-10 rounded-md" />
            </div>
          </div>
          </section>
          <section className="space-y-4"><h2 className="border-b pb-2 text-base font-bold">Description et historique</h2>
          <div className="space-y-1.5">
            <label htmlFor="proposal-category" className="text-sm font-semibold">Catégorie *</label>
            <select id="proposal-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="Energy Drink">Boisson énergisante</option><option value="Soda">Soda</option><option value="Soft Drink">Boisson sans alcool</option><option value="Limited Edition">Édition limitée</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-description" className="text-sm font-semibold">Informations complémentaires</label>
            <textarea id="proposal-description" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Toute information permettant d’identifier cette canette…" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proposal-history" className="text-sm font-semibold">Contexte historique</label>
            <textarea id="proposal-history" maxLength={1500} value={historicalContext} onChange={(e) => setHistoricalContext(e.target.value)} placeholder="Origine, année de lancement, évolution du design…" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          </section>
          <section className="space-y-4"><h2 className="border-b pb-2 text-base font-bold">Caractéristiques et couleurs</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><label htmlFor="proposal-caffeine" className="text-sm font-semibold">Caféine (mg / 100 ml)</label><Input id="proposal-caffeine" type="number" min={0} value={caffeine} onChange={(e) => setCaffeine(e.target.value)} placeholder="Facultatif" className="h-10 rounded-md" /></div>
            <div className="space-y-1.5"><label htmlFor="proposal-sugar" className="text-sm font-semibold">Sucres (g / 100 ml)</label><Input id="proposal-sugar" type="number" min={0} step="0.1" value={sugar} onChange={(e) => setSugar(e.target.value)} placeholder="Facultatif" className="h-10 rounded-md" /></div>
            <div className="space-y-1.5"><label htmlFor="proposal-taurine" className="text-sm font-semibold">Taurine (mg / 100 ml)</label><Input id="proposal-taurine" type="number" min={0} value={taurine} onChange={(e) => setTaurine(e.target.value)} placeholder="Facultatif" className="h-10 rounded-md" /></div>
            <div className="space-y-1.5"><label htmlFor="proposal-energy" className="text-sm font-semibold">Énergie (kcal / 100 ml)</label><Input id="proposal-energy" type="number" min={0} step="0.1" value={energy} onChange={(e) => setEnergy(e.target.value)} placeholder="Facultatif" className="h-10 rounded-md" /></div>
            <div className="space-y-1.5"><label htmlFor="proposal-primary" className="text-sm font-semibold">Couleur principale (hex)</label><Input id="proposal-primary" value={colorPrimary} onChange={(e) => setColorPrimary(e.target.value)} placeholder="#222222" className="h-10 rounded-md" /></div>
            <div className="space-y-1.5"><label htmlFor="proposal-secondary" className="text-sm font-semibold">Couleur secondaire (hex)</label><Input id="proposal-secondary" value={colorSecondary} onChange={(e) => setColorSecondary(e.target.value)} placeholder="#ffffff" className="h-10 rounded-md" /></div>
            <div className="space-y-1.5"><label htmlFor="proposal-tab" className="text-sm font-semibold">Couleur de la languette</label><Input id="proposal-tab" value={tabColor} onChange={(e) => setTabColor(e.target.value)} placeholder="ex. argentée, rouge…" className="h-10 rounded-md" /></div>
          </div>
          </section>
          <section className="space-y-4"><h2 className="border-b pb-2 text-base font-bold">Photos et vérification</h2>
            <div>
              <h2 className="font-bold">Photos</h2>
              <p className="text-xs text-muted-foreground">La photo de face est obligatoire. Prends une photo avec la caméra ou choisis une image dans ta galerie. Les photos du dos et du code-barres sont facultatives. JPG, PNG ou WebP ; 8 Mo maximum par photo.</p>
            </div>
            {([
              ["front", "Face avant de la canette *", true],
              ["back", "Dos de la canette (facultatif)", false],
              ["barcode", "Gros plan du code-barres (facultatif)", false],
            ] as const).map(([key, label, required]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`photo-${key}`} className="text-sm font-medium">{label}</label>
                <input id={`photo-${key}`} type="file" accept="image/jpeg,image/png,image/webp" required={required} onChange={(e) => chooseImage(key, e.target.files?.[0])} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold file:text-secondary-foreground" />
                {images[key] && <div className="mt-2 flex items-center gap-3"><img src={URL.createObjectURL(images[key]!)} alt={`Aperçu : ${label}`} className="h-20 w-16 rounded-lg border object-contain" /><p className="min-w-0 break-all text-xs text-primary">{images[key]?.name}</p></div>}
              </div>
            ))}
          </section>
          <div className="space-y-1.5"><label htmlFor="proposal-notes" className="text-sm font-semibold">Notes complémentaires</label><textarea id="proposal-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sources, références ou précisions utiles à la vérification…" rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={historyVerified} onChange={(e) => setHistoryVerified(e.target.checked)} /> J’ai vérifié les informations historiques renseignées</label>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Chaque proposition est vérifiée avant publication. Les codes-barres en double et les propositions incomplètes ou inappropriées peuvent être refusés.</div>
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
      <Button type="button" variant="ghost" className="-ml-3 mb-2 rounded-xl" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.assign("/"); }}>← Retour</Button>
      <h1 className="text-2xl font-black">Scanner une canette</h1>
      <p className="text-sm text-muted-foreground">Scanne le code-barres pour retrouver une canette dans le catalogue.</p>
      <Button type="button" variant="outline" className="mt-4 h-11 w-full rounded-xl font-semibold" onClick={() => { setDirectProposal(true); setUnknownVisual(false); setUnknownBarcode(""); setManual(""); setVisionResult(null); setVisionError(""); setName(""); setBrandId(""); setProposedBrandName(""); setNewBrandSelected(false); setModelId(""); setFlavour(""); setReleaseYear(""); setDescription(""); setHistoricalContext(""); setVariantName(""); setRegion(""); setEditionType("standard"); setVolumeMl(""); setNotes(""); setImages({ front: null, back: null, barcode: null }); }}>＋ Ajouter une canette inexistante</Button>
      <div className="relative mt-5 aspect-[3/4] overflow-hidden rounded-3xl border bg-card">

            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            {camError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground"><p>Caméra indisponible. Vérifie les autorisations du navigateur et utilise Cansdex en HTTPS.</p><Button type="button" variant="secondary" className="rounded-xl" onClick={() => { setCamError(false); setCameraAttempt((n) => n + 1); }}>Réessayer la caméra</Button></div>
            ) : <><div className="absolute inset-[12%] rounded-2xl border-2 border-primary/70" /><div className="absolute inset-x-[14%] h-0.5 bg-primary shadow-glow animate-scan-line" /></>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void handle(manual); }} className="mt-4 flex gap-2">
            <Input inputMode="numeric" placeholder="Saisir le code-barres manuellement" value={manual} onChange={(e) => setManual(e.target.value)} className="h-10 rounded-md" />
            <Button type="submit" className="h-12 rounded-xl font-bold">Ajouter</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">Scanne un code-barres pour retrouver une canette déjà répertoriée. S’il est inconnu, tu pourras la proposer à la communauté.</p>

    </div>
  );
}