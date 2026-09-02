import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  } as const;
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary:
      'border border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:surface-2',
    ghost: 'hover:surface-2',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  } as const;
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cx('card p-4 sm:p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-bold sm:text-lg">{children}</h2>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

type Tone = 'ok' | 'warn' | 'error' | 'info' | 'neutral';

const badgeTones: Record<Tone, string> = {
  ok: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  error: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200',
  info: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
  neutral: 'surface-2 text-muted',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export { cx };
