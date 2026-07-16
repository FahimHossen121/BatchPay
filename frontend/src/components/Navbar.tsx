'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Sun, Moon } from 'lucide-react';

export function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme !== 'light';

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <nav className="w-full border-b bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <span className="font-semibold text-base sm:text-lg" style={{ color: 'var(--color-text)' }}>
          BatchPay
        </span>

        <div className="flex items-center gap-3">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-[var(--color-bg-secondary)]"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          <ConnectButton showBalance={false} />
        </div>
      </div>
    </nav>
  );
}
