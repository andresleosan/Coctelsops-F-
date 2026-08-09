export default function ProductImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center bg-gradient-to-br from-primary/20 via-black/60 to-accent/20 p-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-white/70">
      {label}
    </div>
  );
}
