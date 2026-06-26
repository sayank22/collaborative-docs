export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200/50 border border-slate-200" />
          ))}
        </div>
      </main>
    </div>
  );
}