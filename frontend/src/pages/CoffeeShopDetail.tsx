import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import { getCoffeeShopBySlug, getImageUrl, createReview, trackEvent, ApiError, type ApiCoffeeShopDetail } from "../services/coffeeShop";
import { useAuth } from "../hooks/useAuth";
import { formatGoogleRatingLabel } from "../utils/rating";
import { getEffectiveOpenStatus } from "../utils/openStatus";
import NotFound from "./NotFound";

// Catat event analitik "sekali per sesi browser" untuk sebuah kedai.
// Mengembalikan true bila event baru saja dicatat (belum pernah di sesi ini).
function trackOncePerSession(coffeeShopId: string, key: string, eventType: Parameters<typeof trackEvent>[1]): boolean {
  try {
    const storageKey = `ngopi_tracked_${key}_${coffeeShopId}`;
    if (sessionStorage.getItem(storageKey)) return false;
    sessionStorage.setItem(storageKey, "1");
    trackEvent(coffeeShopId, eventType);
    return true;
  } catch {
    // sessionStorage bisa diblokir (mode privat); tetap catat tanpa guard.
    trackEvent(coffeeShopId, eventType);
    return true;
  }
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-9"
    >
      <h2 className="mb-4 text-xl font-black text-heading">{title}</h2>
      {children}
    </motion.section>
  );
}

/* --- Ikon inline (tanpa library tambahan) --- */
function IconArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function IconStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.57l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z" />
    </svg>
  );
}

function IconPin({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconTag({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  );
}

function IconClock({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconWhatsApp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2A9.9 9.9 0 0 0 2.1 11.9c0 1.75.46 3.45 1.34 4.95L2 22l5.27-1.38a9.9 9.9 0 0 0 4.77 1.21h.01a9.9 9.9 0 0 0 9.94-9.9 9.86 9.86 0 0 0-2.9-7.02A9.86 9.86 0 0 0 12.04 2zm5.8 14.02c-.24.68-1.4 1.3-1.94 1.34-.5.05-.96.24-3.24-.7-2.72-1.08-4.44-3.86-4.58-4.04-.14-.18-1.1-1.46-1.1-2.78 0-1.32.7-1.98.94-2.24.24-.26.52-.32.7-.32l.5.01c.16 0 .38-.06.58.44.2.5.7 1.72.76 1.84.06.12.1.26.02.42-.08.16-.16.26-.32.44l-.24.28c-.08.1-.16.2-.08.4.08.2.38.66.82 1.06.56.52 1.04.68 1.24.76.2.08.32.06.44-.04.12-.1.5-.58.64-.78.14-.2.28-.16.46-.1.18.06 1.16.54 1.36.64.2.1.34.14.38.24.04.1.04.56-.2 1.24z" />
    </svg>
  );
}

function IconInstagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function buildMapsUrl(shop: ApiCoffeeShopDetail) {
  if (shop.latitude && shop.longitude) {
    return `https://maps.google.com/?q=${shop.latitude},${shop.longitude}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(`${shop.address}, ${shop.district}, Jember`)}`;
}

function buildWhatsappUrl(phone: string | null) {
  if (!phone) return null;
  const digitsOnly = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digitsOnly}`;
}

function buildInstagramUrl(handle: string | null) {
  if (!handle) return null;
  if (handle.startsWith("http")) return handle;
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

export default function CoffeeShopDetail() {
  const { slug } = useParams();
  const { user, token } = useAuth();
  const [shop, setShop] = useState<ApiCoffeeShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !shop) return;
    if (reviewComment.trim().length < 3) {
      setReviewError("Komentar minimal 3 karakter.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    setSubmittingReview(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      await createReview(shop.id, token, {
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewComment("");
      setReviewSuccess("Ulasan berhasil dikirim!");
      const updated = await getCoffeeShopBySlug(slug!);
      setShop(updated.data);
    } catch (err: any) {
      setReviewError(err instanceof ApiError ? err.message : "Gagal mengirim ulasan");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    } finally {
      setSubmittingReview(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getCoffeeShopBySlug(slug)
      .then((result) => setShop(result.data))
      .catch((err) => {
        if (err instanceof ApiError) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Catat PROFILE_VIEW sekali per kedai per sesi browser begitu data kedai siap.
  // Menu ditampilkan langsung di halaman ini, jadi MENU_VIEW juga dicatat
  // sekali per sesi (tidak ada tombol/halaman menu terpisah).
  const menuTrackedRef = useRef(false);
  useEffect(() => {
    if (!shop) return;
    trackOncePerSession(shop.id, "view", "PROFILE_VIEW");
    if (!menuTrackedRef.current && shop.menus.length > 0) {
      menuTrackedRef.current = true;
      trackOncePerSession(shop.id, "menu", "MENU_VIEW");
    }
  }, [shop]);

  if (loading) {
    return (
      <MainLayout>
        <main className="mx-auto max-w-7xl px-5 py-24">
          <div className="h-80 w-full rounded-3xl skeleton mb-8" />
          <div className="space-y-4">
            <div className="h-10 w-2/3 rounded-xl skeleton" />
            <div className="h-6 w-1/3 rounded-xl skeleton" />
          </div>
        </main>
      </MainLayout>
    );
  }

  if (notFound || !shop) return <NotFound shop />;

  const whatsappUrl = buildWhatsappUrl(shop.phone);
  const instagramUrl = buildInstagramUrl(shop.instagram);
  const rating = shop.rating ?? 0;
  const openStatus = getEffectiveOpenStatus(shop.openingHours, shop.status);

  return (
    <MainLayout>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-7xl px-5 py-10"
      >
        <Link to="/coffee-shops" className="btn-pill btn-pill-outline">
          <IconArrowLeft className="h-4 w-4" />
          Kembali menjelajahi
        </Link>

        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Kartu info: kolom kanan (sticky) di desktop, tampil lebih dulu di mobile */}
          <aside className="order-1 h-fit rounded-2xl card-surface p-6 lg:order-2 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
            {shop.categories[0]?.category && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-terracotta">
                <IconTag className="h-3.5 w-3.5" />
                {shop.categories[0].category.name}
              </span>
            )}

            <h1 className="mt-2 text-4xl font-black break-words text-heading">{shop.name}</h1>

            <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-body">
              <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
              <span>{shop.address}</span>
            </p>

            <div className="mt-4 flex items-center gap-2">
              <IconStar className="h-6 w-6 text-terracotta" />
              <b className="text-2xl font-black text-terracotta">{rating.toFixed(1)}</b>
            </div>
            {shop.ratingSource === "google" ? (
              <p className="mt-1 text-xs text-muted">
                {formatGoogleRatingLabel(shop.googleReviewCount, shop.googleRatingAt)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">{shop.reviewCount} ulasan</p>
            )}

            <div className="my-5 border-t border-subtle" />

            <h2 className="text-base font-black text-heading">Informasi lokasi</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-terracotta text-terracotta">
                  <IconClock className="h-4 w-4" />
                </span>
                <div>
                  <dt className="text-xs font-medium text-muted">Jam operasional</dt>
                  <dd className="font-bold text-heading">{shop.openingHours}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta text-xs font-black text-white">
                  Rp
                </span>
                <div>
                  <dt className="text-xs font-medium text-muted">Kisaran harga</dt>
                  <dd className="font-bold text-heading">{shop.priceRange}</dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 grid gap-3">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent(shop.id, "WHATSAPP_CLICK")}
                  className="btn-pill btn-pill-solid w-full"
                >
                  <IconWhatsApp className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent(shop.id, "INSTAGRAM_CLICK")}
                  className="btn-pill btn-pill-outline w-full"
                >
                  <IconInstagram className="h-4 w-4" />
                  Instagram
                </a>
              )}
              <a
                href={buildMapsUrl(shop)}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent(shop.id, "MAP_CLICK")}
                className="btn-pill btn-pill-outline w-full"
              >
                <IconPin className="h-4 w-4" />
                Buka Google Maps
              </a>
            </div>
          </aside>

          {/* Kolom kiri: foto, fasilitas, deskripsi, menu, ulasan */}
          <section className="order-2 lg:order-1 lg:col-start-1 lg:row-start-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative w-full overflow-hidden rounded-[4px] shadow-lg"
            >
              <img
                src={getImageUrl(shop.images?.[0]?.imageUrl) ?? "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85"}
                alt={shop.name}
                className="aspect-[16/10] w-full rounded-[4px] object-cover"
              />
              {shop.isFeatured && (
                <span className="absolute left-3 top-3 rounded-full bg-terracotta px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                  Featured
                </span>
              )}
              <span className={`badge-status absolute bottom-3 left-3 ${
                openStatus === "buka"
                  ? "badge-status--open"
                  : openStatus === "tutup"
                  ? "badge-status--closed"
                  : "badge-status--unknown"
              }`}>
                <span className="badge-dot" />
                {openStatus === "buka" ? "Buka sekarang" : openStatus === "tutup" ? "Tutup" : "Jam belum pasti"}
              </span>
            </motion.div>

            <Block title="Fasilitas">
              <div className="flex flex-wrap gap-2">
                {shop.facilities.map((item, index) => {
                  const fac = item.facility;
                  return (
                    <motion.span
                      key={fac.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="chip"
                    >
                      <span className="chip-icon">✓</span> {fac.name}
                    </motion.span>
                  );
                })}
              </div>
            </Block>

            <p className="mt-7 max-w-prose leading-8 text-body font-medium">{shop.description}</p>

            <Block title="Menu favorit">
              {shop.menus.length === 0 ? (
                <p className="text-sm text-muted font-medium">Menu belum tersedia.</p>
              ) : (
                <div className="divide-y divide-subtle rounded-2xl bg-white px-5 shadow-sm ring-1 ring-subtle">
                  {shop.menus.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between py-4 text-sm gap-4"
                    >
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={getImageUrl(item.image)!}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <b className="text-heading">{item.name}</b>
                            {item.category && (
                              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-terracotta-strong">
                                {item.category}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted font-medium">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="font-semibold tabular-nums text-terracotta shrink-0">
                        Rp{item.price.toLocaleString("id-ID")}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Block>

            <Block title={`Ulasan & Rating (${shop.reviews.length})`}>
              <div className="space-y-8">
                {user ? (
                  <form onSubmit={handleReviewSubmit} className={`rounded-2xl bg-white p-8 shadow-sm ring-1 ring-subtle space-y-4 ${isShaking ? "animate-shake" : ""}`}>
                    <h3 className="font-black text-lg text-heading">Tulis Ulasan Kamu</h3>
                    {reviewError && <p className="text-sm text-danger font-bold">{reviewError}</p>}
                    {reviewSuccess && (
                      <div className="flex items-center gap-2 text-sm text-success font-bold animate-in fade-in duration-200">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft text-success text-xs">✓</span>
                        {reviewSuccess}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1.5">Rating Bintang *</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full rounded-xl border border-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta font-medium text-heading"
                      >
                        <option value="5">★★★★★ (5 - Sangat Baik)</option>
                        <option value="4">★★★★☆ (4 - Baik)</option>
                        <option value="3">★★★☆☆ (3 - Cukup)</option>
                        <option value="2">★★☆☆☆ (2 - Kurang)</option>
                        <option value="1">★☆☆☆☆ (1 - Buruk)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1.5">Komentar * (min 3 karakter)</label>
                      <textarea
                        required
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Bagikan pengalamanmu ngopi di sini..."
                        className="w-full rounded-xl border border-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta font-medium text-heading placeholder:text-muted"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="rounded-xl bg-terracotta px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-terracotta-strong hover:scale-105 active:scale-95 disabled:opacity-50 transition"
                    >
                      {submittingReview ? "Mengirim..." : "Kirim Ulasan"}
                    </button>
                  </form>
                ) : (
                  <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-subtle text-center text-sm text-body font-medium">
                    Silakan <Link to="/login" className="font-bold text-terracotta underline">login</Link> terlebih dahulu untuk menulis ulasan.
                  </div>
                )}

                {shop.reviews.length === 0 ? (
                  <p className="text-sm text-muted font-medium">Belum ada ulasan untuk coffee shop ini.</p>
                ) : (
                  <div className="space-y-4">
                    {shop.reviews.map((review, index) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-subtle space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <b className="text-heading">{review.user.name}</b>
                          <span className="text-terracotta font-bold text-sm">
                            {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                          </span>
                        </div>
                        <p className="text-sm text-body font-medium leading-relaxed">{review.comment}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </Block>
          </section>
        </div>
      </motion.main>
    </MainLayout>
  );
}