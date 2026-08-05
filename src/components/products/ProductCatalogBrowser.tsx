"use client";

import { useState } from "react";
import { Filter, Search } from "lucide-react";

import type { Category, Product, ProductCategory } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/products/ProductCard";

type ProductCatalogBrowserProps = {
  products: Product[];
  categories: Category[];
};

export default function ProductCatalogBrowser({ products, categories }: ProductCatalogBrowserProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | ProductCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.toLocaleLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const matchesSearch = product.name.toLocaleLowerCase().includes(normalizedQuery)
      || product.description.toLocaleLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            onClick={() => setActiveCategory("all")}
            className="rounded-full"
          >
            Todos
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              onClick={() => setActiveCategory(category.id as ProductCategory)}
              className="rounded-full"
            >
              {category.name}
            </Button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar granizado..."
            className="pl-10 rounded-full"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="text-center py-20 space-y-4">
          <Filter className="w-16 h-16 text-muted mx-auto" />
          <h3 className="text-xl font-bold">No encontramos lo que buscas</h3>
          <p className="text-muted-foreground">Prueba con otros términos o cambia la categoría.</p>
          <Button variant="outline" onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}>
            Limpiar Filtros
          </Button>
        </div>
      )}
    </>
  );
}
