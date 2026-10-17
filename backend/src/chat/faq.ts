export const FAQ_RESPONSES: Record<string, string> = {
  apa_itu:
    'Ngopi Jember adalah platform direktori kedai kopi dan kafe di wilayah Jember yang memudahkan Anda menemukan tempat ngopi terbaik, lengkap dengan informasi fasilitas, menu, jam buka, kisaran harga, dan ulasan.',
  cara_daftar:
    'Anda dapat mendaftarkan akun baru melalui halaman Register di aplikasi dengan mengisi nama, email, password, dan memilih peran (User atau Owner).',
  daftar_owner:
    'Untuk mendaftar sebagai pemilik kedai (Owner), pilih peran "Owner" saat melakukan registrasi akun baru, atau hubungi admin.',
  tambah_kedai:
    'Pemilik kedai (Owner atau Admin) yang sudah login dapat menambahkan kedai baru melalui dashboard owner dengan mengisi informasi nama, alamat di Jember, kecamatan, jam buka, dan kisaran harga.',
  verifikasi:
    'Setiap kedai yang didaftarkan oleh owner akan berstatus unverified sampai diverifikasi oleh Admin agar tampil di pencarian publik.',
  ulasan:
    'Pengguna yang sudah login dapat memberikan ulasan berupa komentar dan rating bintang (1-5) pada halaman detail kedai.',
  gps:
    'Fitur lokasi GPS memungkinkan Anda mendeteksi posisi Anda saat ini di Jember untuk mencari kedai terdekat dalam radius tertentu menggunakan perhitungan jarak.',
}

export function getFaqAnswer(topic: string): string {
  return (
    FAQ_RESPONSES[topic] ||
    'Maaf, saya belum memiliki informasi detail mengenai topik tersebut. Silakan tanyakan hal lain seputar kedai kopi atau fitur Ngopi Jember.'
  )
}
