import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import ConversionFunnel from "@/components/ConversionFunnel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cansdex — Construis ta collection" },
      { name: "description", content: "Découvre, collectionne et partage tes canettes préférées. Commence ton parcours Cansdex." },
      { property: "og:title", content: "Cansdex — Construis ta collection" },
      { property: "og:description", content: "Ta collection de canettes commence ici." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/collection", replace: true });
  }, [loading, user, navigate]);

  return <ConversionFunnel />;
}
