"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import ProductImagePlaceholder from "@/components/products/ProductImagePlaceholder";
import type { Product } from "@/types/catalog";

export default function CocktailCarousel({ products }: { products: Product[] }) {
  const slides = products.filter((product) => product.active && product.featured);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (slides.length < 2 || !isAutoPlay) return;
    const timer = setInterval(() => setCurrentIndex((previous) => (previous + 1) % slides.length), 4000);
    return () => clearInterval(timer);
  }, [isAutoPlay, slides.length]);

  useEffect(() => {
    setCurrentIndex((previous) => Math.min(previous, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  if (slides.length === 0) {
    return <ProductImagePlaceholder label="Catálogo en preparación" />;
  }

  const currentProduct = slides[currentIndex];
  const moveTo = (index: number) => {
    setIsAutoPlay(false);
    setCurrentIndex(index);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/5">
      <div className="relative h-full w-full">
        {slides.map((product, index) => (
          <div key={product.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? "opacity-100" : "opacity-0"}`}>
            {product.image ? (
              <Image src={product.image} alt={product.name} fill className="object-contain" priority={index === 0} />
            ) : (
              <ProductImagePlaceholder label="Imagen pendiente" />
            )}
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-black/90 p-3 backdrop-blur-xl">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white">ESTADO OPS</span>
          <span className="flex items-center gap-2 text-[9px] font-black uppercase text-green-400"><span className="h-1.5 w-1.5 animate-ping rounded-full bg-green-400" />ABIERTO AHORA</span>
        </div>
      </div>

      {slides.length > 1 && <>
        <div className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((product, index) => <button key={product.id} type="button" onClick={() => moveTo(index)} className={`h-2 rounded-full transition-all ${index === currentIndex ? "w-8 bg-primary shadow-[0_0_10px_rgba(233,30,99,0.8)]" : "w-2 bg-white/40 hover:bg-white/60"}`} aria-label={`Ir al producto ${index + 1}`} />)}
        </div>
        <button type="button" onClick={() => moveTo((currentIndex - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 transition-all hover:bg-primary/80" aria-label="Producto anterior"><span aria-hidden="true">&lsaquo;</span></button>
        <button type="button" onClick={() => moveTo((currentIndex + 1) % slides.length)} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 transition-all hover:bg-primary/80" aria-label="Producto siguiente"><span aria-hidden="true">&rsaquo;</span></button>
      </>}

      <div className="absolute left-4 right-4 top-4 z-10">
        <div className="inline-block rounded-lg border border-primary/40 bg-black/80 px-4 py-2 backdrop-blur-xl"><p className="text-sm font-black uppercase tracking-wide text-primary">{currentProduct.name}</p></div>
      </div>
    </div>
  );
}
