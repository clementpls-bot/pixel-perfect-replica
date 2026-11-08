import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type CanSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

/** Normalize accents, punctuation and case for multilingual catalogue searches. */
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Common flavour translations used by energy-drink catalogues (FR/EN/ES/IT). */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  myrtille: ["blueberry", "arandano", "mirtillo"],
  blueberry: ["myrtille", "arandano", "mirtillo"],
  arandano: ["myrtille", "blueberry", "mirtillo"],
  mirtillo: ["myrtille", "blueberry", "arandano"],
  fraise: ["strawberry", "fresa", "fragola"],
  strawberry: ["fraise", "fresa", "fragola"],
  fresa: ["fraise", "strawberry", "fragola"],
  fragola: ["fraise", "strawberry", "fresa"],
  framboise: ["raspberry", "frambuesa", "lampone"],
  raspberry: ["framboise", "frambuesa", "lampone"],
  frambuesa: ["framboise", "raspberry", "lampone"],
  lampone: ["framboise", "raspberry", "frambuesa"],
  mure: ["blackberry", "mora", "more"],
  blackberry: ["mure", "mora", "more"],
  mora: ["mure", "blackberry", "more"],
  cerise: ["cherry", "cereza", "ciliegia"],
  cherry: ["cerise", "cereza", "ciliegia"],
  cereza: ["cerise", "cherry", "ciliegia"],
  ciliegia: ["cerise", "cherry", "cereza"],
  citron: ["lemon", "limon", "limone"],
  lemon: ["citron", "limon", "limone"],
  limon: ["citron", "lemon", "limone"],
  limone: ["citron", "lemon", "limon"],
  "citron vert": ["lime", "lima"],
  vert: ["lime", "lima"],
  lime: ["citron vert", "lima"],
  lima: ["citron vert", "lime"],
  verde: ["lime"],
  green: ["lime"],
  pasteque: ["watermelon", "sandia", "anguria"],
  watermelon: ["pasteque", "sandia", "anguria"],
  sandia: ["pasteque", "watermelon", "anguria"],
  anguria: ["pasteque", "watermelon", "sandia"],
  pomme: ["apple", "manzana", "mela"],
  apple: ["pomme", "manzana", "mela"],
  manzana: ["pomme", "apple", "mela"],
  mela: ["pomme", "apple", "manzana"],
  peche: ["peach", "melocoton", "pesca"],
  peach: ["peche", "melocoton", "pesca"],
  melocoton: ["peche", "peach", "pesca"],
  pesca: ["peche", "peach", "melocoton"],
  raisin: ["grape", "uva", "uva"],
  grape: ["raisin", "uva"],
  uva: ["raisin", "grape"],
  orange: ["naranja", "arancia"],
  naranja: ["orange", "arancia"],
  arancia: ["orange", "naranja"],
  ananas: ["pineapple", "pina"],
  pineapple: ["ananas", "pina"],
  pina: ["ananas", "pineapple"],
  noix: ["coconut", "coco"],
  coconut: ["noix de coco", "coco"],
  coco: ["coconut", "noix de coco"],
  goyave: ["guava", "guayaba"],
  guava: ["goyave", "guayaba"],
  guayaba: ["goyave", "guava"],
  classique: ["classic", "original", "clasico", "classico"],
  classic: ["classique", "original", "clasico", "classico"],
  original: ["classique", "classic", "clasico", "classico"],
  clasico: ["classique", "classic", "original", "classico"],
  classico: ["classique", "classic", "original", "clasico"],
  sans: ["sugarfree", "sugar free", "sin", "senza"],
  sugarfree: ["sans sucre", "sugar free", "sin azucar", "senza zucchero"],
  "sans sucre": ["sugarfree", "sugar free", "sin azucar", "senza zucchero"],
  azucar: ["sugarfree", "sugar free", "sans sucre", "senza zucchero"],
  zucchero: ["sugarfree", "sugar free", "sans sucre", "sin azucar"],
};

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1]! + 1,
        previous[j]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length]!;
}

function tokenMatches(queryToken: string, haystackTokens: string[]) {
  const alternatives = [queryToken, ...(SEARCH_SYNONYMS[queryToken] ?? [])]
    .flatMap((value) => normalizeSearch(value).split(/\s+/))
    .filter(Boolean);
  return alternatives.some((alternative) => haystackTokens.some((candidate) => {
    if (candidate.includes(alternative) || alternative.includes(candidate)) return true;
    if (Math.abs(candidate.length - alternative.length) > 2) return false;
    const tolerance = alternative.length >= 8 ? 2 : alternative.length >= 5 ? 1 : 0;
    return tolerance > 0 && levenshtein(alternative, candidate) <= tolerance;
  }));
}

/** All query words must match, with typo tolerance and FR/EN/ES/IT flavour equivalents. */
export function matchesSearch(
  query: string,
  values: Array<string | number | null | undefined>,
) {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearch(values.filter((value) => value != null).join(" "));
  const haystackTokens = haystack.split(/\s+/).filter(Boolean);
  return tokens.every((token) => tokenMatches(token, haystackTokens));
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
        className="h-11 rounded-full border-0 bg-[#f2f3f6] pl-10 pr-10 shadow-none placeholder:text-[#8d929d] focus-visible:ring-2 focus-visible:ring-[#d9dbe2]"
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
