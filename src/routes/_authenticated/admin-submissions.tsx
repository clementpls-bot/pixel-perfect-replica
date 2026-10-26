import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin-submissions")({
  head: () => ({ meta: [{ title: "Can submissions review — Cansdex" }] }),
  component: AdminSubmissions,
});

function AdminSubmissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const isAdmin = user?.app_metadata?.role === "admin";
  const { data: submissions, isLoading, error } = useQuery({
    queryKey: ["can-submissions-review"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("can_submissions")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("approve_can_submission", { p_submission_id: id });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["can-submissions-review"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Can approved and added to the official catalogue.");
    } catch (error) {
      toast.error((error as Error).message || "Unable to approve this submission.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    const reviewNotes = window.prompt("Reason for rejection (optional):")?.trim() || null;
    if (reviewNotes === null && !window.confirm("Reject this submission without a reason?")) return;
    setBusyId(id);
    try {
      const { error } = await supabase.from("can_submissions").update({
        status: "rejected",
        review_notes: reviewNotes,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id).eq("status", "pending");
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["can-submissions-review"] });
      toast.success("Submission rejected.");
    } catch (error) {
      toast.error((error as Error).message || "Unable to reject this submission.");
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return <div className="py-12 text-center"><h1 className="text-2xl font-black">Admin access required</h1><p className="mt-2 text-sm text-muted-foreground">This page is only available to trusted catalogue reviewers.</p></div>;
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Moderation</p>
        <h1 className="mt-1 text-2xl font-black">Can submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review the details and photos before adding a can to the official catalogue.</p>
      </header>
      {isLoading && <p className="text-sm text-muted-foreground">Loading submissions…</p>}
      {error && <p className="text-sm text-destructive">Could not load submissions: {error.message}</p>}
      {!isLoading && !error && submissions?.length === 0 && <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">No submissions yet.</div>}
      <div className="space-y-4">
        {submissions?.map((submission) => (
          <article key={submission.id} className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <h2 className="font-bold">{submission.name}</h2>
                <p className="break-all text-xs text-muted-foreground">Barcode: {submission.barcode}</p>
                <p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(submission.created_at).toLocaleString()}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${submission.status === "pending" ? "bg-amber-500/10 text-amber-600" : submission.status === "approved" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{submission.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4">
              {[["Front", submission.image_url], ["Back", submission.back_image_url], ["Barcode", submission.barcode_image_url]].map(([label, url]) => (
                <div key={label} className="min-w-0">
                  {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`${label} photo of ${submission.name}`} className="aspect-[3/4] w-full rounded-xl border object-cover" /></a> : <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed text-[10px] text-muted-foreground">No {label.toLowerCase()} photo</div>}
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 p-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Flavour</dt><dd>{submission.flavour || "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Release year</dt><dd>{submission.release_year ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Category</dt><dd>{submission.category}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Brand ID</dt><dd className="break-all text-xs">{submission.brand_id || "Unknown"}</dd></div>
              {submission.description && <div className="col-span-2"><dt className="text-xs text-muted-foreground">Details</dt><dd className="whitespace-pre-wrap">{submission.description}</dd></div>}
              {submission.review_notes && <div className="col-span-2"><dt className="text-xs text-muted-foreground">Review note</dt><dd>{submission.review_notes}</dd></div>}
            </dl>
            {submission.status === "pending" && (
              <div className="flex gap-2 border-t p-4">
                <Button disabled={busyId === submission.id} onClick={() => void approve(submission.id)} className="h-11 flex-1 rounded-xl font-bold">{busyId === submission.id ? "Working…" : "Approve"}</Button>
                <Button disabled={busyId === submission.id} onClick={() => void reject(submission.id)} variant="secondary" className="h-11 flex-1 rounded-xl font-bold">Reject</Button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
