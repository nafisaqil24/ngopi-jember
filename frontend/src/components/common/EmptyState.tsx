export default function EmptyState({ title = "Data tidak ditemukan", message = "Belum ada data yang tersedia saat ini.", action }: { title?: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl bg-cream/50 p-8 text-center ring-1 ring-espresso/10 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream dark:bg-zinc-800 text-espresso/60 dark:text-zinc-400 font-bold text-lg">
        ∅
      </div>
      <h3 className="mt-4 text-lg font-black text-espresso dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-espresso/70 dark:text-zinc-400 leading-relaxed">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
