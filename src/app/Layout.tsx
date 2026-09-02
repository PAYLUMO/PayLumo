import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FileSearch, History, Home, Settings, Moon, Sun } from 'lucide-react';
import { BrandLockup } from '@/components/Brand';
import { useTheme } from '@/app/theme';
import { cx } from '@/components/ui';

const NAV = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/analyser', label: 'Analyser', icon: FileSearch, end: false },
  { to: '/historique', label: 'Historique', icon: History, end: false },
  { to: '/parametres', label: 'Réglages', icon: Settings, end: false },
];

function ThemeToggle() {
  const { resolved, setMode } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:surface-2"
      aria-label={resolved === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
    >
      {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-[rgb(var(--bg))] px-4 py-3">
        <NavLink to="/" aria-label="Accueil PayLumo">
          <BrandLockup />
        </NavLink>
        <div className="flex items-center gap-1">
          <nav className="hidden gap-1 sm:flex">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200' : 'hover:surface-2',
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-24 sm:pb-8">
        <Outlet key={pathname} />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-[rgb(var(--bg))] sm:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium',
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-muted',
              )
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
