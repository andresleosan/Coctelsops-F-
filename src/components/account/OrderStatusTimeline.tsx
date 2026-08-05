import { Check, Circle, XCircle } from 'lucide-react';

import type { CustomerOrder, OrderStatus } from '@/types/orders';

const statusSteps: Array<{ status: Exclude<OrderStatus, 'cancelado'>; title: string; description: string }> = [
  { status: 'pendiente', title: 'Pedido recibido', description: 'Tu solicitud llegó a la central.' },
  { status: 'confirmado', title: 'Pedido confirmado', description: 'La central confirmó tu pedido.' },
  { status: 'preparando', title: 'En preparación', description: 'Estamos preparando tus bebidas.' },
  { status: 'en_camino', title: 'En camino', description: 'Tu pedido va hacia la dirección indicada.' },
  { status: 'entregado', title: 'Entregado', description: 'Disfruta tu pedido.' },
];

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha pendiente' : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function OrderStatusTimeline({ order }: { order: CustomerOrder }) {
  const currentIndex = statusSteps.findIndex((step) => step.status === order.status);
  const history = new Map(order.statusHistory.map((event) => [event.status, event]));

  return (
    <div className="space-y-4">
      {statusSteps.map((step, index) => {
        const complete = order.status !== 'cancelado' && currentIndex >= index;
        const event = history.get(step.status);
        return (
          <div key={step.status} className="relative flex gap-3 pl-1">
            {index < statusSteps.length - 1 && <span className={`absolute left-[11px] top-7 h-[calc(100%+1rem)] w-px ${complete && currentIndex > index ? 'bg-primary/70' : 'bg-border'}`} aria-hidden="true" />}
            <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${complete ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>
              {complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
            </span>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className={`text-sm font-bold ${complete ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>{event && <time className="text-xs text-muted-foreground">{formatDate(event.at)}</time>}</div>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        );
      })}
      {order.status === 'cancelado' && (
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive"><XCircle className="h-5 w-5 shrink-0" /><div><p className="text-sm font-bold">Pedido cancelado</p><p className="text-xs">Este pedido ya no continúa.</p></div></div>
      )}
    </div>
  );
}
