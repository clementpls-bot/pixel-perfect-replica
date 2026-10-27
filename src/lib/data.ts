import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Brand = { id: string; slug: string; name: string; color: string; logo_url: string | null };
export type Can = {
  id: string; barcode: string; name: string; brand_id: string; release_year: number | null;
  flavour: string | null; description: string | null; historical_context: string | null;
  image_url: string | null; color_primary: string; color_secondary: string; category: string;
};

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [b, c] = await Promise.all([
        supabase.from("brands").select("id,slug,name,color,logo_url").order("name"),
        supabase.from("cans").select("*").order("release_year"),
      ]);
      if (b.error) throw b.error;
      if (c.error) throw c.error;
      return { brands: b.data as Brand[], cans: c.data as Can[] };
    },
  });
}

export function useOwned() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owned", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_cans").select("can_id,quantity,first_scanned_at");
      if (error) throw error;
      return new Map(data.map((r) => [r.can_id, r.quantity]));
    },
  });
}

/** Scanning unlocks a can once; scanning it again never increases its quantity. */
export function useAddCan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (canId: string) => {
    if (!user) throw new Error("Connecte-toi d’abord.");
    const { data: existing, error: lookupError } = await supabase
      .from("user_cans").select("id").eq("can_id", canId).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return false;

    const { error } = await supabase.from("user_cans").insert({
      can_id: canId, user_id: user.id, quantity: 1,
    });
    // A concurrent scan may have inserted the same can. Don't turn it into a quantity increment.
    if (error) {
      if (error.code === "23505") {
        await qc.invalidateQueries({ queryKey: ["owned", user.id] });
        return false;
      }
      throw error;
    }
    await qc.invalidateQueries({ queryKey: ["owned", user.id] });
    return true;
  };
}

/** Quantity changes are available only after a can has been unlocked by scanning. */
export function useAdjustCanQuantity() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return async (canId: string, delta: 1 | -1) => {
    if (!user) throw new Error("Sign in first");
    const { data: existing, error: lookupError } = await supabase
      .from("user_cans").select("id,quantity").eq("can_id", canId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) throw new Error("Scanne d’abord cette canette pour l’ajouter à ta collection.");

    if (delta === 1) {
      const { error } = await supabase.from("user_cans")
        .update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
      if (error) throw error;
    } else if (existing.quantity <= 1) {
      const { error } = await supabase.from("user_cans").delete().eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("user_cans")
        .update({ quantity: existing.quantity - 1 }).eq("id", existing.id);
      if (error) throw error;
    }
    await qc.invalidateQueries({ queryKey: ["owned", user.id] });
  };
}
