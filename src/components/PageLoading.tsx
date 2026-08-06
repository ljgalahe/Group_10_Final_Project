export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-green-800"
        aria-hidden
      />
      <p className="text-sm text-stone-500">{label}</p>
    </div>
  );
}
