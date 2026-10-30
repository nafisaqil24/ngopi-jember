// Mengubah nama kedai menjadi slug yang aman untuk URL.
// Urutan: lowercase+trim -> buang karakter selain huruf/angka/spasi/hubung ->
// rapatkan setiap rangkaian spasi/hubung jadi satu hubung -> buang hubung di ujung.
// Bila hasil kosong (mis. nama hanya simbol), pakai "kedai".
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'kedai'
}
