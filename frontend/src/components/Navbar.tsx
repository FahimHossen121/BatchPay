import { NavbarActions } from '@/components/NavbarActions';

export function Navbar() {
  return (
    <nav className="relative w-full border-b bg-[var(--color-bg)]" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="font-semibold text-base sm:text-lg" style={{ color: 'var(--color-text)' }}>
          BatchPay
        </span>

        <NavbarActions />
      </div>
    </nav>
  );
}
