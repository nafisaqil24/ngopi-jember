import { useEffect, useState } from "react";

export type GoogleRatingInput = {
  googleRating: number | null;
  googleReviewCount: number | null;
  googleRatingAt: string | null;
};

type GoogleRatingPanelProps = {
  initialRating: number | null | undefined;
  initialReviewCount: number | null | undefined;
  initialRatingAt: string | null | undefined;
  saving?: boolean;
  onSave: (input: GoogleRatingInput) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function GoogleRatingPanel({
  initialRating,
  initialReviewCount,
  initialRatingAt,
  saving = false,
  onSave,
  onDelete,
}: GoogleRatingPanelProps) {
  const [rating, setRating] = useState(initialRating !== null && initialRating !== undefined ? String(initialRating) : "");
  const [reviewCount, setReviewCount] = useState(
    initialReviewCount !== null && initialReviewCount !== undefined ? String(initialReviewCount) : ""
  );
  const [ratingAt, setRatingAt] = useState(toDateInput(initialRatingAt));
  const [error, setError] = useState("");

  useEffect(() => {
    setRating(initialRating !== null && initialRating !== undefined ? String(initialRating) : "");
    setReviewCount(initialReviewCount !== null && initialReviewCount !== undefined ? String(initialReviewCount) : "");
    setRatingAt(toDateInput(initialRatingAt));
  }, [initialRating, initialReviewCount, initialRatingAt]);

  const hasRating = initialRating !== null && initialRating !== undefined;

  async function handleSubmit() {
    setError("");
    const trimmedRating = rating.trim();
    if (!trimmedRating) {
      setError("Rating Google wajib diisi. Gunakan tombol Hapus untuk menghapusnya.");
      return;
    }
    const ratingNum = Number(trimmedRating);
    if (Number.isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      setError("Rating harus angka antara 0 dan 5.");
      return;
    }

    let reviewCountValue: number | null = null;
    const trimmedCount = reviewCount.trim();
    if (trimmedCount) {
      const countNum = Number(trimmedCount);
      if (Number.isNaN(countNum) || countNum < 0 || !Number.isInteger(countNum)) {
        setError("Jumlah ulasan harus bilangan bulat minimal 0.");
        return;
      }
      reviewCountValue = countNum;
    }

    await onSave({
      googleRating: ratingNum,
      googleReviewCount: reviewCountValue,
      googleRatingAt: ratingAt ? new Date(ratingAt).toISOString() : null,
    });
  }

  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-espresso/10">
      <div className="mb-5">
        <h3 className="text-xl font-black">Rating</h3>
        <p className="text-sm text-espresso/65">
          Atur rating dari Google Maps yang akan ditampilkan untuk kedai ini. Hanya admin yang dapat mengubahnya.
        </p>
      </div>

      {error && <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="google-rating-input" className="mb-1 block text-xs font-bold text-espresso/70">
            Rating Google (0-5)
          </label>
          <input
            id="google-rating-input"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="4.5"
            className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
          />
        </div>
        <div>
          <label htmlFor="google-review-count-input" className="mb-1 block text-xs font-bold text-espresso/70">
            Jumlah ulasan Google
          </label>
          <input
            id="google-review-count-input"
            type="number"
            min="0"
            step="1"
            value={reviewCount}
            onChange={(e) => setReviewCount(e.target.value)}
            placeholder="150"
            className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
          />
        </div>
        <div>
          <label htmlFor="google-rating-at-input" className="mb-1 block text-xs font-bold text-espresso/70">
            Tanggal ambil rating
          </label>
          <input
            id="google-rating-at-input"
            type="date"
            value={ratingAt}
            onChange={(e) => setRatingAt(e.target.value)}
            className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {hasRating && (
          <button
            type="button"
            onClick={() => onDelete()}
            disabled={saving}
            className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-2 text-sm font-bold text-danger hover:brightness-95 disabled:opacity-50"
          >
            Hapus rating Google
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-xl bg-terracotta px-5 py-2 text-sm font-bold text-white hover:bg-terracotta-strong disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan rating Google"}
        </button>
      </div>
    </div>
  );
}