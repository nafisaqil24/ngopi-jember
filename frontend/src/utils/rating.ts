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
  return `Rating per ${formatted}${countText}`;
}