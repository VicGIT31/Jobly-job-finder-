export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="card p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {title}
          <span className="text-cobalt">.</span>
        </h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
