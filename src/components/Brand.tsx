export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="PayLumo">
      <rect width="64" height="64" rx="14" className="fill-brand-500" />
      <path
        d="M32 12a14 14 0 0 0-9 24.6c1.7 1.5 2.8 3.3 3 5.4h12c.2-2.1 1.3-3.9 3-5.4A14 14 0 0 0 32 12Z"
        fill="#fff"
      />
      <path
        d="M26 48h12M28 53h8M23 20a10 10 0 0 1 6-6"
        fill="none"
        className="stroke-brand-500"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLockup({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className="h-7 w-7" />
      <span className="text-lg font-extrabold tracking-tight">
        Pay<span className="text-brand-600 dark:text-brand-400">Lumo</span>
      </span>
    </span>
  );
}
