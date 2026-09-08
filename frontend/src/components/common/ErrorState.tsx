export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl bg-red-50 p-8 text-center ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 font-black text-lg">
        !
      </div>
      <h3 className="mt-4 text-lg font-black text-red-900 dark:text-red-200">Terjadi Kesalahan</h3>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
