'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function NavbarActions() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = resolvedTheme !== 'light';

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function toggleTheme() {
    setTheme(isDark ? 'light' : 'dark');
  }

  return (
    <>
      <div className="hidden items-center gap-3 sm:flex">
        <ThemeButton mounted={mounted} isDark={isDark} onToggle={toggleTheme} />
        <WalletControls mounted={mounted} />
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <ThemeButton mounted={mounted} isDark={isDark} onToggle={toggleTheme} />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-wallet-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="navbar-icon-button"
        >
          <span className="relative h-5 w-5">
            <Menu
              size={20}
              className={`absolute inset-0 transition duration-200 ${
                menuOpen ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'
              }`}
            />
            <X
              size={20}
              className={`absolute inset-0 transition duration-200 ${
                menuOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'
              }`}
            />
          </span>
        </button>
      </div>

      <div
        id="mobile-wallet-menu"
        className={`absolute left-0 right-0 top-full z-20 grid overflow-hidden border-b bg-[var(--color-bg)] transition-[grid-template-rows,opacity] duration-200 ease-out sm:hidden ${
          menuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="min-h-0">
          <div className="mx-auto flex max-w-5xl justify-end px-4 py-3">
            <WalletControls mounted={mounted} />
          </div>
        </div>
      </div>
    </>
  );
}

function ThemeButton({
  mounted,
  isDark,
  onToggle,
}: {
  mounted: boolean;
  isDark: boolean;
  onToggle: () => void;
}) {
  if (!mounted) {
    return <div aria-hidden="true" className="h-9 w-9 rounded-md border border-[var(--color-border)]" />;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className="navbar-icon-button"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function WalletControls({ mounted }: { mounted: boolean }) {
  if (!mounted) {
    return <div aria-hidden="true" className="h-10 w-44 rounded-md border border-[var(--color-border)]" />;
  }

  return (
    <ConnectButton
      accountStatus={{ largeScreen: 'full', smallScreen: 'address' }}
      chainStatus={{ largeScreen: 'full', smallScreen: 'icon' }}
      showBalance={false}
    />
  );
}
