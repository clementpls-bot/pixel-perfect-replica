import { useEffect, useState } from "react";

/** A lightweight, decorative Halloween layer. It never intercepts clicks. */
export function BatOverlay() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (reducedMotion) return null;

  return (
    <div className="bat-overlay" aria-hidden="true">
      <svg className="bat bat-one" viewBox="0 0 48 24" focusable="false">
        <path d="M24 10 C20 3 15 2 9 3 L2 0 5 8 0 12 10 11 15 17 20 13 24 16 28 13 33 17 38 11 48 12 43 8 46 0 39 3 C33 2 28 3 24 10Z" />
      </svg>
      <svg className="bat bat-two" viewBox="0 0 48 24" focusable="false">
        <path d="M24 10 C20 3 15 2 9 3 L2 0 5 8 0 12 10 11 15 17 20 13 24 16 28 13 33 17 38 11 48 12 43 8 46 0 39 3 C33 2 28 3 24 10Z" />
      </svg>
      <svg className="bat bat-three" viewBox="0 0 48 24" focusable="false">
        <path d="M24 10 C20 3 15 2 9 3 L2 0 5 8 0 12 10 11 15 17 20 13 24 16 28 13 33 17 38 11 48 12 43 8 46 0 39 3 C33 2 28 3 24 10Z" />
      </svg>
    </div>
  );
}
