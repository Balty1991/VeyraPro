export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex flex-col gap-1 border-b border-border bg-surface px-6 py-5">
      <h1 className="text-xl font-semibold tracking-tight text-ink-primary">{title}</h1>
      {subtitle && <p className="text-sm text-ink-secondary">{subtitle}</p>}
    </header>
  );
}
