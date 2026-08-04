
"use client";

import type { Product } from '@/types/catalog';
import type { OrderCustomization } from '@/types/orders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ProductCustomizerProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductCustomizer({ product, open, onOpenChange }: ProductCustomizerProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  
  const [size, setSize] = useState<OrderCustomization['size']>('Medium');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const handleAddToCart = () => {
    const addOnPrices = product.availableAddOns
      .filter(addon => selectedAddOns.includes(addon.name))
      .reduce((sum, addon) => sum + addon.price, 0);

    const sizeMultiplier = size === 'Small' ? 0.8 : size === 'Large' ? 1.3 : 1;
    const finalPrice = Math.round(product.price * sizeMultiplier + addOnPrices);

    addItem({
      productId: product.id,
      name: product.name,
      price: finalPrice,
      quantity: 1,
      image: product.image,
      customization: {
        size,
        flavors: selectedFlavors,
        addOns: selectedAddOns,
      }
    });

    toast({
      title: "¡Agregado al carrito!",
      description: `${product.name} listo para refrescarte.`
    });

    onOpenChange(false);
  };

  const toggleFlavor = (flavor: string) => {
    setSelectedFlavors(prev => 
      prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]
    );
  };

  const toggleAddOn = (addon: string) => {
    setSelectedAddOns(prev => 
      prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="relative w-full h-40 rounded-lg overflow-hidden mb-4">
            <Image 
              src={product.image} 
              alt={product.name} 
              fill 
              className="object-cover" 
            />
          </div>
          <DialogTitle className="text-2xl font-headline text-primary">{product.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{product.description}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tamaño</Label>
            <RadioGroup value={size} onValueChange={(value) => setSize(value as OrderCustomization['size'])} className="grid grid-cols-3 gap-2">
              {['Small', 'Medium', 'Large'].map((s) => (
                <div key={s}>
                  <RadioGroupItem value={s} id={s} className="peer sr-only" />
                  <Label
                    htmlFor={s}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center"
                  >
                    <span className="text-sm font-medium">{s}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Sabores Disponibles</Label>
            <div className="grid grid-cols-2 gap-3">
              {product.availableFlavors.map((flavor) => (
                <div key={flavor} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`flavor-${flavor}`} 
                    checked={selectedFlavors.includes(flavor)}
                    onCheckedChange={() => toggleFlavor(flavor)}
                  />
                  <Label htmlFor={`flavor-${flavor}`} className="text-sm font-normal cursor-pointer">
                    {flavor}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Adiciones (+)</Label>
            <div className="grid gap-3">
              {product.availableAddOns.map((addon) => (
                <div key={addon.name} className="flex items-center justify-between p-2 rounded-lg border bg-secondary/20">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`addon-${addon.name}`}
                      checked={selectedAddOns.includes(addon.name)}
                      onCheckedChange={() => toggleAddOn(addon.name)}
                    />
                    <Label htmlFor={`addon-${addon.name}`} className="text-sm font-normal cursor-pointer">
                      {addon.name}
                    </Label>
                  </div>
                  <span className="text-xs font-bold text-primary">+${addon.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAddToCart} disabled={product.stock <= 0} className="w-full text-lg h-12 rounded-full">
            {product.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
