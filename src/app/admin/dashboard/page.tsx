
'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, DollarSign, Package, RefreshCw, Eye, CheckCircle2 } from 'lucide-react';
import { useMemoFirebase } from '@/firebase/firestore/use-memo-firebase';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { AdminGuard } from '@/components/admin/AdminGuard';

type OrderItem = {
  quantity?: number;
  name?: string;
  price?: number;
};

type Order = {
  id: string;
  total?: number;
  status: string;
  phone?: string;
  customerName?: string;
  items?: OrderItem[];
  address?: string;
  notes?: string;
};

export default function AdminDashboard() {
  const db = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);

  const { data: orders, loading } = useCollection<Order>(ordersQuery);

  const stats = {
    totalSales: orders?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0,
    pending: orders?.filter((o) => o.status === 'Pendiente').length || 0,
    newClients: new Set(orders?.map((o) => o.phone)).size || 0,
    totalOrders: orders?.length || 0
  };

  const updateStatus = (id: string, newStatus: string) => {
    if (!db) return;
    const orderRef = doc(db, 'orders', id);
    updateDoc(orderRef, { status: newStatus })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: orderRef.path,
          operation: 'update',
          requestResourceData: { status: newStatus }
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <AdminGuard>
      <div className="container mx-auto px-4 py-8 md:py-12 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary italic neon-text-magenta uppercase tracking-tighter">PANEL OPS</h1>
          <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px]">Gestión en tiempo real</p>
        </div>
        <Button size="lg" className="w-full md:w-auto bg-primary text-white rounded-full font-black text-xs h-14 px-8 shadow-lg shadow-primary/20" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" /> ACTUALIZAR DATOS
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
        {[
          { label: 'Ventas', value: `$${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Pendientes', value: stats.pending.toString(), icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Clientes', value: stats.newClients.toString(), icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Total Hoy', value: stats.totalOrders.toString(), icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10' }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-2xl bg-card/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden">
            <CardContent className="p-5 md:p-8 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl md:text-2xl font-headline font-bold uppercase tracking-tight text-white/90">ÚLTIMOS PEDIDOS</h2>
          <Badge variant="outline" className="border-primary text-primary font-bold text-[10px] animate-pulse px-3 py-1">EN VIVO</Badge>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium italic">Sincronizando con la nube...</p>
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground italic text-sm bg-card/20 rounded-3xl border border-dashed border-white/10">
            No hay pedidos registrados en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders?.map((order) => (
              <Card key={order.id} className="border-none bg-card/40 border border-white/5 shadow-2xl hover:border-primary/40 transition-all rounded-[2rem] overflow-hidden group">
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-lg leading-tight">{order.customerName}</h4>
                      <p className="text-sm text-primary font-bold tracking-wider">{order.phone}</p>
                    </div>
                    <Badge 
                      className={`text-[10px] px-3 py-1 font-bold rounded-full ${
                        order.status === 'Pendiente' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        order.status === 'Preparando' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        order.status === 'En Camino' ? 'bg-accent/10 text-accent border-accent/20' :
                        'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}
                    >
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-3 py-4 border-y border-white/5">
                    {order.items?.map((it, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm text-white/80">
                        <span className="font-light">{it.quantity}x {it.name}</span>
                        <span className="font-bold text-white">${it.price?.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="pt-3 flex justify-between items-end border-t border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Total OPS</span>
                      <span className="text-2xl font-black text-primary">${order.total?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Entrega</p>
                    <p className="text-sm text-white/90 font-medium leading-relaxed">{order.address}</p>
                    {order.notes && (
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                        <p className="text-[11px] italic text-muted-foreground">Nota: {order.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    {order.status === 'Pendiente' && (
                      <Button 
                        className="flex-1 bg-primary text-white h-12 text-xs font-black tracking-widest rounded-full shadow-lg shadow-primary/20"
                        onClick={() => updateStatus(order.id, 'Preparando')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> PREPARAR
                      </Button>
                    )}
                    {order.status === 'Preparando' && (
                      <Button 
                        className="flex-1 bg-accent text-black h-12 text-xs font-black tracking-widest rounded-full shadow-lg shadow-accent/20"
                        onClick={() => updateStatus(order.id, 'En Camino')}
                      >
                        <Package className="w-4 h-4 mr-2" /> ENVIAR
                      </Button>
                    )}
                    {order.status === 'En Camino' && (
                      <Button 
                        className="flex-1 bg-green-500 text-white h-12 text-xs font-black tracking-widest rounded-full shadow-lg shadow-green-500/20"
                        onClick={() => updateStatus(order.id, 'Entregado')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> ENTREGADO
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-white/10 hover:bg-white/5">
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </div>
    </AdminGuard>
  );
}
