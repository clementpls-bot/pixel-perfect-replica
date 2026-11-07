import { cn } from "@/lib/utils";

export function CanPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 96"
      role="img"
      aria-label="Illustration de canette"
      className={cn("text-current", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 9.5C19 6.5 24.8 4 32 4s13 2.5 13 5.5v4H19v-4Z" fill="currentColor" opacity=".16" />
      <path d="M19 13.5h26l4 7v61l-4 8H19l-4-8v-61l4-7Z" fill="currentColor" opacity=".08" />
      <path d="M19 13.5h26l4 7v61l-4 8H19l-4-8v-61l4-7Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M19 13.5c0-3 5.8-5.5 13-5.5s13 2.5 13 5.5-5.8 5.5-13 5.5-13-2.5-13-5.5Z" stroke="currentColor" strokeWidth="2.5" />
      <path d="M25 12.5c1.6-1.1 4.1-1.7 7-1.7 2.5 0 4.7.5 6.3 1.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 29h14M25 68h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".45" />
      <path d="M32 38v19m-7-9.5h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".75" />
      <path d="M19 87.5c0 2.5 5.8 4.5 13 4.5s13-2 13-4.5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}
