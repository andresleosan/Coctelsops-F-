import { listActiveProducts } from '@/lib/firestore/products';
import { listCategories } from '@/lib/firestore/categories';
import ProductCatalogBrowser from '@/components/products/ProductCatalogBrowser';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const [products, categories] = await Promise.all([listActiveProducts(), listCategories()]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">Nuestro Menú</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Explora nuestra selección de bebidas artesanales, preparadas con fruta fresca y mucho amor.
        </p>
      </div>

      {/* Menú Interactivo Canva */}
      <div className="mb-16 text-center">
        <div className="bg-card/40 border border-primary/20 rounded-[2rem] p-8 backdrop-blur-xl">
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-primary mb-4">Ver Menú Completo</h2>
          <p className="text-muted-foreground mb-6">Abre nuestro menú interactivo para explorar todos nuestros productos</p>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-primary hover:bg-primary/90 text-white font-bold px-8"
          >
            <a
              href="https://cartacoctelsops.my.canva.site/?fbclid=PAY2xjawIBM0BleHRuA2FlbQIxMAABpo07SqMFni5aqLVnII7WNFsKVhxq3eOu2xY8bP-DEYY-UbmWzsnyb0pfyw_aem_9w328MMocFp3VHv0IGkJaA"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir Menú en Canva →
            </a>
          </Button>
        </div>
      </div>

      <ProductCatalogBrowser products={products} categories={categories} />
    </div>
  );
}
