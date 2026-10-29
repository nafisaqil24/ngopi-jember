export type RatingSource = "google" | "ulasan" | null | undefined

// Rating dianggap kosong bila tidak ada nilai, atau bernilai 0 tanpa ulasan
// dan bukan berasal dari Google. Rating 0 dari Google tetap dianggap valid.
export function hasRating(
  rating: number | null | undefined,
  reviewCount: number | null | undefined,
  ratingSource?: RatingSource
): boolean {
  if (rating === null || rating === undefined || Number.isNaN(rating)) return false
  if (rating === 0 && (reviewCount ?? 0) === 0 && ratingSource !== "google") return false
  return true
}

// Teks rating publik yang konsisten di seluruh halaman.
export function formatRating(
  rating: number | null | undefined,
  reviewCount: number | null | undefined,
  ratingSource?: RatingSource
): string {
  if (!hasRating(rating, reviewCount, ratingSource)) return "Belum ada rating"
  return (rating as number).toFixed(1)
}

// Label sumber rating publik. Dipakai halaman detail kedai untuk menandai
// bahwa angka rating berasal dari Google Maps (bukan ulasan internal).
export function formatGoogleRatingLabel(
  reviewCount: number | null | undefined,
  ratingAt: string | Date | null | undefined
): string | null {
  if (!ratingAt) return null;
  const date = ratingAt instanceof Date ? ratingAt : new Date(ratingAt);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const countText =
    reviewCount !== null && reviewCount !== undefined ? ` (${reviewCount} ulasan)` : "";
  return `Rating Google Maps, per ${formatted}${countText}`;
}