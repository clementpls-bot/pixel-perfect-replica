import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Brand = { id: string; slug: string; name: string; color: string; logo_url: string | null };
export type Can = {
  id: string; barcode: string; name: string; brand_id: string; release_year: number | null;
  flavour: string | null; description: string | null; historical_context: string | null;
  image_url: string | null; back_image_url: string | null; barcode_image_url: string | null; color_primary: string; color_secondary: string; category: string;
  caffeine_mg_per_100ml: number | null; sugar_g_per_100ml: number | null; taurine_mg_per_100ml: number | null;
  energy_kcal_per_100ml: number | null; volume_ml: number | null; history_verified: boolean;
  model_id: string | null; variant_name: string; region: string | null; edition_type: string;
  tab_color: string | null; notes: string | null;
};
export type CanModel = {
  id: string; brand_id: string; slug: string; name: string; flavour: string | null;
  description: string | null; cover_image_url: string | null;
};
export type CanCondition = "full" | "empty" | "empty_bottom_opened";
export const CONDITIONS: { value: CanCondition; label: string }[] = [
  { value: "full", label: "Pleine" },
  { value: "empty", label: "Vide" },
  { value: "empty_bottom_opened", label: "Vide, percée par le bas" },
];
export const EDITION_LABELS: Record<string, string> = {
  standard: "Standard", limited: "Édition limitée", collab: "Collab", import: "Import", redesign: "Redesign",
};

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [b, c, m] = await Promise.all([
        supabase.from("brands").select("id,slug,name,color,logo_url").order("name"),
        supabase.from("cans").select("*").order("release_year"),
        supabase.from("can_models").select("id,brand_id,slug,name,flavour,description,cover_image_url").order("name"),
      ]);
      if (b.error) throw b.error;
      if (c.error) throw c.error;
      if (m.error) throw m.error;
      return { brands: b.data as unknown as Brand[], cans: c.data as unknown as Can[], models: m.data as CanModel[] };
    },
  });
}

export function useOwned() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owned", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_cans").select("can_id,quantity,condition");
      if (error) throw error;
      const totals = new Map<string, number>();
      for (const r of data) totals.set(r.can_id, 1);
      return totals;
    },
  });
}

/** Quantity owned per design variant and per condition. */
export function useOwnedByCondition() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owned-conditions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_cans").select("can_id,quantity,condition");
      if (error) throw error;
      const map = new Map<string, Partial<Record<CanCondition, number>>>();
      for (const r of data) {
        const entry = map.get(r.can_id) ?? {};
        entry[r.condition as CanCondition] = r.quantity;
        map.set(r.can_id, entry);
      }
      return map;
    },
  });
}

function invalidateOwned(qc: ReturnType<typeof useQueryClient>, userId: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["owned", userId] }),
    qc.invalidateQueries({ queryKey: ["owned-conditions", userId] }),
  ]);
}

/** Scanning unlocks a can once; scanning it again never increases its quantity. */
export function useAddCan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (canId: string) => {
    if (!user) throw new Error("Connecte-toi d’abord.");
    const { data: existing, error: lookupError } = await supabase
      .from("user_cans").select("id").eq("can_id", canId).limit(1).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return false;

    const { error } = await supabase.from("user_cans").insert({
      can_id: canId, user_id: user.id, quantity: 1, condition: "full",
    });
    // A concurrent scan may have inserted the same can. Don't turn it into a quantity increment.
    if (error) {
      if (error.code === "23505") {
        await invalidateOwned(qc, user.id);
        return false;
      }
      throw error;
    }
    await invalidateOwned(qc, user.id);
    return true;
  };
}

/** Quantity changes per condition are available only after a variant has been unlocked by scanning. */
export function useAdjustCanQuantity() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (canId: string, delta: 1 | -1, condition: CanCondition = "full") => {
    if (!user) throw new Error("Connecte-toi d’abord.");
    const { data: rows, error: lookupError } = await supabase
      .from("user_cans").select("id,quantity,condition").eq("can_id", canId);
    if (lookupError) throw lookupError;
    if (!rows || rows.length === 0) throw new Error("Scanne d’abord cette canette pour l’ajouter à ta collection.");
    const row = rows.find((r) => r.condition === condition);

    if (delta === 1) {
      const { error } = row
        ? await supabase.from("user_cans").update({ quantity: row.quantity + 1 }).eq("id", row.id)
        : await supabase.from("user_cans").insert({ can_id: canId, user_id: user.id, quantity: 1, condition });
      if (error) throw error;
    } else if (row) {
      if (row.quantity <= 1) {
        const { error } = await supabase.from("user_cans").delete().eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_cans").update({ quantity: row.quantity - 1 }).eq("id", row.id);
        if (error) throw error;
      }
    }
    await invalidateOwned(qc, user.id);
  };
}


/** Ownership is a simple yes/no toggle; legacy condition rows are treated as ownership. */
export function useSetCanOwned() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (canId: string, shouldOwn: boolean) => {
    if (!user) throw new Error("Connecte-toi pour gérer ton coffre.");
    if (shouldOwn) throw new Error("Scanne cette canette pour l’ajouter à ton mur.");
    const { data: rows, error: lookupError } = await supabase
      .from("user_cans").select("id").eq("can_id", canId);
    if (lookupError) throw lookupError;
    if (shouldOwn) {
      if (!rows?.length) {
        const { error } = await supabase.from("user_cans").insert({
          can_id: canId, user_id: user.id, quantity: 1, condition: "full",
        });
        if (error && error.code !== "23505") throw error;
      }

      // Owning a can sets a minimum of one Drink without overwriting a higher total.
      const { data: existingDrinks, error: drinksLookupError } = await supabase
        .from("user_can_drinks")
        .select("drinks_count")
        .eq("user_id", user.id)
        .eq("can_id", canId)
        .maybeSingle();
      if (drinksLookupError) throw drinksLookupError;
      if (!existingDrinks || existingDrinks.drinks_count < 1) {
        const { error: drinksSaveError } = await supabase.from("user_can_drinks").upsert({
          user_id: user.id,
          can_id: canId,
          drinks_count: Math.max(1, existingDrinks?.drinks_count ?? 0),
          updated_at: new Date().toISOString(),
        });
        if (drinksSaveError) throw drinksSaveError;
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["can-drinks", user.id, canId] }),
        qc.invalidateQueries({ queryKey: ["can-drinks-community", canId] }),
      ]);
    } else if (rows?.length) {
      const { error } = await supabase.from("user_cans").delete().eq("can_id", canId);
      if (error) throw error;
    }
    await invalidateOwned(qc, user.id);
  };
}

export function useCanDrinks(canId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["can-drinks", user?.id, canId],
    enabled: !!user && !!canId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_can_drinks").select("drinks_count").eq("can_id", canId).maybeSingle();
      if (error) throw error;
      return data?.drinks_count ?? 0;
    },
  });
}

export function useSetCanDrinks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (canId: string, drinksCount: number) => {
    if (!user) throw new Error("Connecte-toi pour enregistrer tes Drinks.");

    // The UI guard is not enough: verify ownership before writing the counter.
    const { data: ownedCan, error: ownershipError } = await supabase
      .from("user_cans")
      .select("id")
      .eq("user_id", user.id)
      .eq("can_id", canId)
      .limit(1)
      .maybeSingle();
    if (ownershipError) throw ownershipError;
    if (!ownedCan) throw new Error("Tu dois posséder cette canette sur ton mur avant d’enregistrer des Drinks.");

    const safeCount = Math.max(0, Math.min(100000, Math.floor(drinksCount)));
    const { error } = await supabase.from("user_can_drinks").upsert({
      user_id: user.id, can_id: canId, drinks_count: safeCount, updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["can-drinks", user.id, canId] }),
      qc.invalidateQueries({ queryKey: ["can-drinks-community", canId] }),
    ]);
  };
}
