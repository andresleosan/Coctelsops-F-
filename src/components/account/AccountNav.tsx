'use client';

import Link from 'next/link';
import { ClipboardList, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/cuenta', label: 'Resumen', icon: UserRound },
  { href: '/cuenta/perfil', label: 'Mi perfil', icon: UserRound },
  { href: '/cuenta/pedidos', label: 'Mis pedidos', icon: ClipboardList },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de mi cuenta" className="flex gap-2 overflow-x-auto border-b border-border pb-2 md:block md:space-y-2 md:border-b-0 md:pb-0">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === '/cuenta' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-full ${active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
