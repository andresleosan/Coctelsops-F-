
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, Sparkles, RefreshCcw, ShoppingCart } from 'lucide-react';
import { aiFlavorSuggester, AIFlavorSuggesterOutput } from '@/ai/flows/ai-flavor-suggester';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AISuggestPage() {
  const [preferences, setPreferences] = useState('');
  const [result, setResult] = useState<AIFlavorSuggesterOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;
    
    setLoading(true);
    try {
      const output = await aiFlavorSuggester({ preferences });
      setResult(output);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No pudimos generar una sugerencia en este momento."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-1 rounded-full text-primary font-bold text-sm">
            <BrainCircuit className="w-4 h-4" />
            <span>AI Powered Innovation</span>
          </div>
          <h1 className="text-5xl font-headline font-bold">Chef Virtual de Granizados</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Cuéntanos qué sabores te gustan y nuestra inteligencia artificial creará una combinación única y deliciosa para ti.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Tus Preferencias</CardTitle>
              <CardDescription>Dinos tus frutas favoritas, si lo quieres dulce, ácido o tropical.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSuggest} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="prefs">Ejemplo: &quot;Quiero algo muy cítrico con frutos rojos y un toque picante&quot;</Label>
                  <Input 
                    id="prefs" 
                    placeholder="Describe tus antojos..." 
                    className="h-14 rounded-xl"
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full py-7 text-lg rounded-xl gap-2 shadow-lg shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCcw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  {loading ? 'Consultando al Chef AI...' : 'Generar Receta Única'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="min-h-[400px] flex items-center justify-center">
            {result ? (
              <Card className="w-full border-none bg-primary text-white shadow-2xl animate-in zoom-in-95 duration-500">
                <CardHeader className="text-center">
                  <div className="mx-auto bg-white/20 p-4 rounded-full w-fit mb-4">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <Badge variant="secondary" className="mx-auto bg-white text-primary mb-2">Sugerencia AI</Badge>
                  <CardTitle className="text-3xl font-headline">{result.flavorName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-center text-white/90 text-lg italic">
                    &quot;{result.description}&quot;
                  </p>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-bold uppercase tracking-wider text-white/70">Ingredientes Principales:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.ingredients.map((ing, i) => (
                        <span key={i} className="bg-white/10 px-3 py-1 rounded-full text-sm">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full bg-white text-primary hover:bg-white/90 py-6 rounded-xl font-bold mt-4" onClick={() => toast({ title: "¡Funcionalidad próximamente!", description: "Estamos habilitando el pedido directo de creaciones AI." })}>
                    <ShoppingCart className="w-5 h-5 mr-2" /> Pedir Esta Mezcla
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center space-y-6 opacity-40">
                <div className="w-40 h-40 border-4 border-dashed border-primary/30 rounded-full flex items-center justify-center mx-auto">
                  <BrainCircuit className="w-16 h-16 text-primary" />
                </div>
                <p className="font-medium">Esperando tus preferencias para crear magia...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
