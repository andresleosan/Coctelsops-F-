
"use client";

import { useState } from 'react';
import { PRODUCTS, Product } from '@/app/lib/products';
import ProductCard from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | Product['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories: { label: string; value: 'all' | Product['category'] }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Granizados', value: 'granizado' },
    { label: 'Cocteles', value: 'cocktail' },
    { label: 'Especiales', value: 'special' },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">Nuestro Menú</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Explora nuestra selección de bebidas artesanales, preparadas con fruta fresca y mucho amor.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={activeCategory === cat.value ? 'default' : 'outline'}
              onClick={() => setActiveCategory(cat.value)}
              className="rounded-full"
            >
              {cat.label}
            </Button>
          ))}
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar granizado..." 
            className="pl-10 rounded-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 space-y-4">
          <Filter className="w-16 h-16 text-muted mx-auto" />
          <h3 className="text-xl font-bold">No encontramos lo que buscas</h3>
          <p className="text-muted-foreground">Prueba con otros términos o cambia la categoría.</p>
          <Button variant="outline" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
            Limpiar Filtros
          </Button>
        </div>
      )}
    </div>
  );
}
