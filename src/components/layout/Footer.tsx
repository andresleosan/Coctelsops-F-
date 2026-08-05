
"use client";

import { Instagram, Facebook, MapPin, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-secondary/30 border-t border-primary/20 py-12 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
          <div className="space-y-4">
            <h3 className="font-headline font-bold text-primary text-xl tracking-wider">Coctels OPS</h3>
            <p className="text-sm text-muted-foreground">
              ¡¡ QUE CHIMBA UN OPS !! <br />
              Llevamos la mejor refrescancia neón directamente a tu puerta.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground uppercase tracking-widest text-xs">Explora</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/menu" className="hover:text-primary transition-colors">Nuestro Menú</Link></li>
              <li><Link href="/ai-suggest" className="hover:text-primary transition-colors">Sugeridor de Sabores</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground uppercase tracking-widest text-xs">Domicilios</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-center md:justify-start gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="font-bold text-primary">WhatsApp: 324 554 5530</span>
              </li>
              <li className="flex items-center justify-center md:justify-start gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Carrera 37 # 66 D 36, Villa Hermosa</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground uppercase tracking-widest text-xs">Síguenos</h4>
            <div className="flex justify-center md:justify-start gap-4">
              <Link href="https://www.instagram.com/coctels_ops" target="_blank" className="bg-primary/10 p-2 rounded-full border border-primary/20 hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="bg-primary/10 p-2 rounded-full border border-primary/20 hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-t border-primary/10 mt-12 pt-8 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Coctels OPS. ¡Estamos a tu alcance!</p>
        </div>
      </div>
    </footer>
  );
}
