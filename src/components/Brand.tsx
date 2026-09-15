// Logo officiel PayLumo (carré vert, ampoule blanche, « PAYLUMO »), détouré du
// fichier fourni. `public/logo-mark.webp` = le logo sans la marge extérieure,
// coins arrondis transparents (lisible sur fond clair comme sombre).

/** Le logo complet, texte inclus. Dimensionner par la hauteur (`h-…`). */
export function BrandMark({ className = 'h-8' }: { className?: string }) {
  return (
    <img
      src="/logo-mark.webp"
      alt="PayLumo"
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}

/** Alias : le logo porte déjà le mot « PAYLUMO ». */
export function BrandLockup({ className = 'h-8' }: { className?: string }) {
  return <BrandMark className={className} />;
}
