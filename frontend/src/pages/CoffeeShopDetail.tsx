import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import { getCoffeeShopBySlug, getImageUrl, createReview, trackEvent, ApiError, type ApiCoffeeShopDetail } from "../services/coffeeShop";
import { useAuth } from "../hooks/useAuth";
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

  return (
    <MainLayout>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-7xl px-5 py-10"
      >
        <Link
          to="/coffee-shops"
          className="inline-flex items-center gap-2 rounded-xl border border-terracotta/30 bg-accent-soft px-4 py-2 text-sm font-semibold text-terracotta-strong transition-all duration-200 hover:bg-terracotta hover:text-white hover:scale-105 active:scale-95 shadow-xs"
        >
          Kembali menjelajah
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-5"
        >
          <img
            src={getImageUrl(shop.images?.[0]?.imageUrl) ?? "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85"}
            alt={shop.name}
            className="h-80 w-full rounded-3xl object-cover shadow-lg"
          />
        </motion.div>

        <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_330px]">
          <section>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex gap-2">
                  {shop.isFeatured && (
                    <span className="rounded-full bg-terracotta px-3 py-1 text-xs font-bold text-white shadow-md uppercase tracking-wider font-mono">
                      Featured
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      shop.status === "OPEN"
                        ? "bg-success-soft text-success"
                        : "bg-danger-soft text-danger"
                    }`}
                  >
                    {shop.status === "OPEN" ? "Buka sekarang" : "Tutup"}
                  </span>
                </div>
                <h1 className="mt-3 text-4xl font-black text-heading">{shop.name}</h1>
                <p className="mt-2 text-body font-medium">⌖ {shop.address}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-subtle">
                <b className="text-xl text-terracotta">★ {rating.toFixed(1)}</b>
                <p className="text-xs text-body font-medium">{shop.reviewCount} ulasan</p>
              </div>
            </div>

            <p className="mt-7 leading-8 text-body font-medium">{shop.description}</p>

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
                      className="rounded-lg bg-surface px-3.5 py-2 text-sm shadow-sm ring-1 ring-subtle font-medium text-body inline-flex items-center gap-1.5"
                    >
                      <span className="text-terracotta font-bold">✓</span> {fac.name}
                    </motion.span>
                  );
                })}
              </div>
            </Block>

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
                      <div className="font-bold text-terracotta shrink-0">
                        Rp{item.price.toLocaleString("id-ID")}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Block>

            <Block title={`Ulasan & Rating (${shop.reviews.length})`}>
              <div className="space-y-6">
                {user ? (
                  <form onSubmit={handleReviewSubmit} className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-subtle space-y-4 ${isShaking ? "animate-shake" : ""}`}>
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

          <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm ring-1 ring-subtle sticky top-24">
            <h2 className="text-lg font-black text-heading">Informasi lokasi</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-muted font-medium">Jam operasional</dt>
                <dd className="mt-1 font-bold text-heading">{shop.openingHours}</dd>
              </div>
              <div>
                <dt className="text-muted font-medium">Kisaran harga</dt>
                <dd className="mt-1 font-bold text-heading">{shop.priceRange}</dd>
              </div>
            </dl>
            <div className="mt-6 grid gap-3">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent(shop.id, "WHATSAPP_CLICK")}
                  className="rounded-xl bg-[#25D366] py-3 text-center text-sm font-bold text-white hover:scale-105 active:scale-95 transition shadow-sm"
                >
                  WhatsApp
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent(shop.id, "INSTAGRAM_CLICK")}
                  className="rounded-xl border border-strong py-3 text-center text-sm font-bold text-heading hover:bg-info-soft hover:scale-105 active:scale-95 transition shadow-xs"
                >
                  Instagram
                </a>
              )}
              <a
                href={buildMapsUrl(shop)}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent(shop.id, "MAP_CLICK")}
                className="rounded-xl border border-strong py-3 text-center text-sm font-bold text-heading hover:bg-info-soft hover:scale-105 active:scale-95 transition shadow-xs"
              >
                Buka Google Maps
              </a>
            </div>
          </aside>
        </div>
      </motion.main>
    </MainLayout>
  );
}