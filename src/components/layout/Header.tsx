
"use client";

import Link from 'next/link';
import { ShoppingCart, Menu, GlassWater, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { AuthStatus } from '@/components/auth/AuthStatus';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from 'react';

export default function Header() {
  const { totalItems } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  const NavItems = () => (
    <>
      <Link href="/menu" className="text-sm font-medium hover:text-primary transition-colors">
        Menú
      </Link>
      <Link href="/ai-suggest" className="text-sm font-medium flex items-center gap-1 hover:text-primary transition-colors">
        <BrainCircuit className="w-4 h-4" />
        Sugeridor AI
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px] bg-background">
              <SheetHeader>
                <SheetTitle className="text-left font-headline text-primary flex items-center gap-2">
                  <GlassWater className="w-6 h-6" />
                  Coctels OPS
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8" onClick={() => setIsOpen(false)}>
                <NavItems />
              </nav>
            </SheetContent>
          </Sheet>
          
          <Link href="/" className="flex items-center gap-2">
            <GlassWater className="w-8 h-8 text-primary" />
            <span className="font-headline font-bold text-xl tracking-tight text-primary hidden sm:inline-block">
              Coctels OPS
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <NavItems />
        </nav>

        <div className="flex items-center gap-4">
          <AuthStatus />
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>
          <Button className="hidden sm:flex shadow-lg shadow-primary/20" asChild>
            <Link href="/menu">Pedir Ahora</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
