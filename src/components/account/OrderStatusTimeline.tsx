import { Check, Circle, XCircle } from 'lucide-react';

import { getOrderTimeline, isTimelineConnectorComplete } from '@/lib/orders/status-timeline';
import type { CustomerOrder } from '@/types/orders';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha pendiente' : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function OrderStatusTimeline({ order }: { order: CustomerOrder }) {
  const timeline = getOrderTimeline(order);

  return (
    <div className="space-y-4">
      {timeline.map((event, index) => {
        const cancellation = event.status === 'cancelado';
        return (
          <div key={event.status} className="relative flex gap-3 pl-1">
            {index < timeline.length - 1 && <span className={`absolute left-[11px] top-7 h-[calc(100%+1rem)] w-px ${isTimelineConnectorComplete(event, timeline[index + 1]) ? 'bg-primary/70' : 'bg-border'}`} aria-hidden="true" />}
            <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${cancellation ? 'border-destructive bg-destructive text-destructive-foreground' : event.complete ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>
              {cancellation ? <XCircle className="h-3.5 w-3.5" /> : event.complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
            </span>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className={`text-sm font-bold ${cancellation ? 'text-destructive' : event.complete ? 'text-foreground' : 'text-muted-foreground'}`}>{event.title}</p>{event.at && <time dateTime={event.at} className="text-xs text-muted-foreground">{formatDate(event.at)}</time>}</div>
              <p className="text-xs text-muted-foreground">{event.description}</p>
              {event.reason && <p className="text-xs text-destructive">Motivo: {event.reason}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
