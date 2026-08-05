"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';

const COCKTAIL_IMAGES = [
  { id: 'fresa', name: 'Fresa Salvaje', src: '/Fresa.png' },
  { id: 'mango', name: 'Mango Biche Special', src: '/Mango.png' },
  { id: 'coco', name: 'Coco Loco Tropical', src: '/Coco.png' },
  { id: 'maracuya', name: 'Explosión de Maracuyá', src: '/Maracuya.png' },
  { id: 'lulo', name: 'Lulo Refrescante', src: '/Lulo.png' },
];

export default function CocktailCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!isAutoPlay) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % COCKTAIL_IMAGES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isAutoPlay]);

  const handlePrev = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev - 1 + COCKTAIL_IMAGES.length) % COCKTAIL_IMAGES.length);
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev + 1) % COCKTAIL_IMAGES.length);
  };

  const handleDotClick = (index: number) => {
    setIsAutoPlay(false);
    setCurrentIndex(index);
  };

  useEffect(() => {
    const resumeTimer = setTimeout(() => {
      setIsAutoPlay(true);
    }, 5000);

    return () => clearTimeout(resumeTimer);
  }, [currentIndex, isAutoPlay]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl border border-white/5">
      <div className="relative w-full h-full">
        {COCKTAIL_IMAGES.map((image, index) => (
          <div
            key={image.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={image.src}
              alt={image.name}
              fill
              className="object-contain"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-black/90 backdrop-blur-xl p-3 rounded-xl border border-primary/40 flex items-center justify-between">
          <span className="font-bold text-[9px] uppercase tracking-widest text-white">ESTADO OPS</span>
          <span className="flex items-center gap-2 text-green-400 text-[9px] font-black uppercase">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
            ABIERTO AHORA
          </span>
        </div>
      </div>

      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        {COCKTAIL_IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-primary w-8 shadow-[0_0_10px_rgba(233,30,99,0.8)]'
                : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-lg border border-primary/40 inline-block">
          <p className="text-sm font-black text-primary uppercase tracking-wide">
            {COCKTAIL_IMAGES[currentIndex].name}
          </p>
        </div>
      </div>

      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-primary/80 p-2 rounded-full transition-all"
        aria-label="Previous image"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-primary/80 p-2 rounded-full transition-all"
        aria-label="Next image"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
