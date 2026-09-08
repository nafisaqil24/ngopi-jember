import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { getCoffeeShopBySlug, getImageUrl, createReview, ApiError, type ApiCoffeeShopDetail } from "../services/coffeeShop";
import { useAuth } from "../hooks/useAuth";
import NotFound from "./NotFound";

// Halaman detail coffee shop, sekarang fetch data ASLI dari backend
// (sebelumnya baca dari data dummy di data.ts).
//
// PERUBAHAN PENTING dibanding versi dummy:
// 1. Data diambil lewat getCoffeeShopBySlug(slug), yang memanggil
//    GET /api/coffee-shops/:slug -- endpoint ini SUDAH menyertakan
//    categories, facilities, images, menus, promotions, reviews
//    sekaligus (lihat coffee-shop.routes.ts di backend), jadi tidak
//    perlu banyak fetch terpisah.
// 2. Field yang dulu ada di data dummy tapi TIDAK ADA di database
//    (whatsapp, instagram sebagai link penuh, googleMapsUrl, galeri
//    foto multi) disesuaikan:
//    - instagram: backend simpan sebagai username/handle, bukan URL
//      penuh, jadi di sini dirangkai jadi link.
//    - whatsapp: backend simpan sebagai "phone", formatnya bebas
//      (mungkin ada spasi/strip), jadi dibersihkan dulu sebelum
//      dipakai di link wa.me.
//    - googleMapsUrl: TIDAK ADA field ini di database. Sebagai
//      gantinya, link Maps dibuat otomatis dari latitude/longitude
//      kalau ada, atau dari alamat sebagai teks pencarian kalau
//      koordinat belum diisi owner.
// 3. Ada state loading & error karena sekarang menunggu jawaban
//    server yang bisa lambat/gagal.
// 4. Menu sekarang dari shop.menus (relasi asli), bukan array
//    hardcode seperti dummy.

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      {children}
    </section>
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

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !shop) return;
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

  if (loading) {
    return (
      <MainLayout>
        <main className="mx-auto max-w-7xl px-5 py-24 text-center text-espresso/60">
          Memuat detail coffee shop...
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
      <main className="mx-auto max-w-7xl px-5 py-10">
        <Link to="/coffee-shops" className="text-sm font-bold text-terracotta">
          ← Kembali menjelajah
        </Link>

        <div className="mt-5">
          <img
            src={getImageUrl(shop.images?.[0]?.imageUrl) ?? "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85"}
            alt={shop.name}
            className="h-80 w-full rounded-3xl object-cover"
          />
        </div>

        <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_330px]">
          <section>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex gap-2">
                  {shop.isFeatured && (
                    <span className="rounded-full bg-terracotta px-3 py-1 text-xs font-bold text-white">
                      Featured
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      shop.status === "OPEN"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {shop.status === "OPEN" ? "Buka sekarang" : "Tutup"}
                  </span>
                </div>
                <h1 className="mt-3 text-4xl font-black">{shop.name}</h1>
               <p className="mt-2 text-espresso/65">⌖ {shop.address}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
                <b className="text-xl text-terracotta">★ {rating.toFixed(1)}</b>
                <p className="text-xs text-espresso/60">{shop.reviewCount} ulasan</p>
              </div>
            </div>

            <p className="mt-7 leading-8 text-espresso/75">{shop.description}</p>

            <Block title="Fasilitas">
              <div className="flex flex-wrap gap-2">
                {shop.facilities.map((facility) => (
                  <span
                    key={facility.id}
                    className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    ✓ {facility.name}
                  </span>
                ))}
              </div>
            </Block>

            <Block title="Menu favorit">
              {shop.menus.length === 0 ? (
                <p className="text-sm text-espresso/60">Menu belum tersedia.</p>
              ) : (
                <div className="divide-y divide-espresso/10 rounded-2xl bg-white px-5 shadow-sm">
                  {shop.menus.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-4 text-sm gap-4">
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
                            <b className="text-espresso">{item.name}</b>
                            {item.category && (
                              <span className="rounded-md bg-espresso/5 px-2 py-0.5 text-xs font-bold text-espresso/70">
                                {item.category}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-espresso/65">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-terracotta shrink-0">
                        Rp{item.price.toLocaleString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Block>

            <Block title={`Ulasan & Rating (${shop.reviews.length})`}>
              <div className="space-y-6">
                {/* Form Ulasan */}
                {user ? (
                  <form onSubmit={handleReviewSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-espresso/10 space-y-4">
                    <h3 className="font-black text-lg">Tulis Ulasan Kamu</h3>
                    {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
                    {reviewSuccess && <p className="text-sm text-green-700">{reviewSuccess}</p>}
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Rating Bintang *</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      >
                        <option value="5">★★★★★ (5 - Sangat Baik)</option>
                        <option value="4">★★★★☆ (4 - Baik)</option>
                        <option value="3">★★★☆☆ (3 - Cukup)</option>
                        <option value="2">★★☆☆☆ (2 - Kurang)</option>
                        <option value="1">★☆☆☆☆ (1 - Buruk)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Komentar * (min 3 karakter)</label>
                      <textarea
                        required
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Bagikan pengalamanmu ngopi di sini..."
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="rounded-xl bg-terracotta px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-terracotta/90 disabled:opacity-50"
                    >
                      {submittingReview ? "Mengirim..." : "Kirim Ulasan"}
                    </button>
                  </form>
                ) : (
                  <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-espresso/10 text-center text-sm text-espresso/70">
                    Silakan <Link to="/login" className="font-bold text-terracotta underline">login</Link> terlebih dahulu untuk menulis ulasan.
                  </div>
                )}

                {/* List Ulasan */}
                {shop.reviews.length === 0 ? (
                  <p className="text-sm text-espresso/60">Belum ada ulasan untuk coffee shop ini.</p>
                ) : (
                  <div className="space-y-4">
                    {shop.reviews.map((review) => (
                      <div key={review.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-espresso/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <b className="text-espresso">{review.user.name}</b>
                          <span className="text-terracotta font-bold text-sm">
                            {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                          </span>
                        </div>
                        <p className="text-sm text-espresso/80 leading-relaxed">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Block>
          </section>

          <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm ring-1 ring-espresso/10">
            <h2 className="text-lg font-black">Informasi lokasi</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-espresso/60">Jam operasional</dt>
                <dd className="mt-1 font-bold">{shop.openingHours}</dd>
              </div>
              <div>
                <dt className="text-espresso/60">Kisaran harga</dt>
                <dd className="mt-1 font-bold">{shop.priceRange}</dd>
              </div>
            </dl>
            <div className="mt-6 grid gap-3">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-[#25D366] py-3 text-center text-sm font-bold text-white"
                >
                  WhatsApp
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-espresso/15 py-3 text-center text-sm font-bold"
                >
                  Instagram
                </a>
              )}
              <a
                href={buildMapsUrl(shop)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-espresso/15 py-3 text-center text-sm font-bold"
              >
                Buka Google Maps
              </a>
            </div>
          </aside>
        </div>
      </main>
    </MainLayout>
  );
}