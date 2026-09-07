import AuthForm from "../components/auth/AuthForm";

// Sebelumnya file ini masih placeholder ("Form login akan dibangun di
// PHASE 4"). Backend auth sudah siap (PHASE 4 selesai), jadi sekarang
// diisi dengan AuthForm yang sudah terhubung ke services/auth.ts.

export default function Login() {
  return <AuthForm register={false} />;
}