import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type CanSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

/** Normalize accents and case so searches behave naturally in French. */
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

/** Every word entered must match somewhere in the searchable fields. */
export function matchesSearch(
  query: string,
  values: Array<string | number | null | undefined>,
) {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearch(values.filter((value) => value != null).join(" "));
  return tokens.every((token) => haystack.includes(token));
}

export function CanSearch({
  value,
  onChange,
  placeholder = "Rechercher une canette, une marque ou un code-barres…",
  ariaLabel = "Rechercher dans les canettes",
  className = "",
}: CanSearchProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-11 rounded-xl pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Effacer la recherche"
          title="Effacer la recherche"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
