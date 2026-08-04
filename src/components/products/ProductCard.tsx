
"use client";

import Image from 'next/image';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Product } from '@/types/catalog';
import { useState, useEffect } from 'react';
import ProductCustomizer from './ProductCustomizer';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formattedPrice, setFormattedPrice] = useState<string | null>(null);

  useEffect(() => {
    // Formatear el precio solo en el cliente para evitar errores de hidratación
    setFormattedPrice(product.price.toLocaleString());
  }, [product.price]);

  // Fallback image to prevent NextJS empty src error
  const imageSrc = product.image || 'https://picsum.photos/seed/placeholder/600/600';

  return (
    <>
      <Card className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-black/40 border-primary/10">
        <CardHeader className="p-0 relative aspect-square overflow-hidden">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            data-ai-hint="refreshing granizado"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/80 backdrop-blur-sm text-primary font-bold border-primary/20">
              {formattedPrice ? `$${formattedPrice}` : '...'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <h3 className="font-headline font-bold text-lg mb-1 group-hover:text-primary transition-colors text-white">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
            {product.description}
          </p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full gap-2 rounded-full group-hover:translate-y-[-2px] transition-transform bg-primary hover:bg-primary/90 neon-shadow-magenta" 
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Personalizar
          </Button>
        </CardFooter>
      </Card>

      <ProductCustomizer 
        product={product} 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
      />
    </>
  );
}
