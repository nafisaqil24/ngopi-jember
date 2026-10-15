export default function EmptyState({ title = "Data tidak ditemukan", message = "Belum ada data yang tersedia saat ini.", action }: { title?: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-espresso/10 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-terracotta dark:bg-zinc-800 dark:text-zinc-400 font-bold text-lg">
        ∅
      </div>
      <h3 className="mt-4 text-lg font-black text-heading dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-body dark:text-zinc-400 leading-relaxed">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
