
"use client";

import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-secondary/20 p-8 rounded-full w-fit mx-auto">
            <ShoppingBag className="w-16 h-16 text-primary/40" />
          </div>
          <h2 className="text-3xl font-headline font-bold">Tu carrito está vacío</h2>
          <p className="text-muted-foreground">Parece que aún no has añadido nada refrescante a tu carrito.</p>
          <Button className="rounded-full px-8 py-6 text-lg" asChild>
            <Link href="/menu">Ver el Menú</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-headline font-bold mb-12">Tu Pedido</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-card/40">
              <CardContent className="p-4 flex gap-4">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={item.image || '/catalog-placeholder.svg'} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <p className="font-bold text-primary">${(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-x-2">
                      <span className="bg-secondary px-2 py-0.5 rounded">{item.customization.size}</span>
                      {item.customization.flavors.map(f => <span key={f}>• {f}</span>)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-3 bg-secondary/30 rounded-full px-3 py-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-white/10"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-white/10"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="border-none shadow-lg bg-card/60 sticky top-24">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-headline font-bold text-xl">Resumen</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                  <span>${totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="text-accent font-medium">Gratis</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <Button className="w-full py-6 rounded-full text-lg font-bold group bg-primary hover:bg-primary/90 neon-shadow-magenta" asChild>
                <Link href="/checkout">
                  Ir al Pago <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
