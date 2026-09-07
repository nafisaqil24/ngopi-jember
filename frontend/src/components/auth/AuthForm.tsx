import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { ApiError, login, register as registerAccount } from "../../services/auth";

// Komponen form gabungan untuk Login & Register, dipindah dari App.tsx
// (dulu bernama "Auth"). Dipakai oleh pages/Login.tsx dan
// pages/Register.tsx dengan prop `register` yang beda, supaya tidak
// perlu menulis 2 form yang hampir identik.

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-espresso/15 px-3 py-3 font-normal outline-none focus:border-terracotta"
      />
    </label>
  );
}

export default function AuthForm({ register }: { register: boolean }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    role: "USER" as "USER" | "OWNER",
    remember: false,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (register && form.name.trim().length < 2) return setMessage("Nama minimal terdiri dari 2 karakter.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setMessage("Masukkan alamat email yang valid.");
    if (form.password.length < 8) return setMessage("Password minimal terdiri dari 8 karakter.");
    if (register && form.password !== form.confirm) return setMessage("Konfirmasi password belum sama.");

    setLoading(true);
    setMessage("");
    try {
      const session = register
        ? await registerAccount({ name: form.name, email: form.email, password: form.password, role: form.role })
        : await login(form.email, form.password);
      localStorage.setItem("ngopi_jember_token", session.token);
      localStorage.setItem("ngopi_jember_user", JSON.stringify(session.user));
      navigate("/");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <main className="mx-auto grid min-h-[65vh] max-w-5xl items-center gap-10 px-5 py-14 md:grid-cols-2">
        <section className="hidden rounded-3xl bg-espresso p-10 text-cream md:block">
          <p className="text-sm font-bold text-orange-300">NGOPI JEMBER</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">
            {register ? "Mulai ceritakan kedaimu." : "Selamat datang kembali."}
          </h1>
          <p className="mt-5 leading-7 text-cream/70">
            Satu tempat untuk menemukan dan membagikan pengalaman ngopi
            terbaik di Jember.
          </p>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-lg ring-1 ring-espresso/10 sm:p-9">
          <h1 className="text-3xl font-black">{register ? "Buat akun" : "Masuk"}</h1>
          <p className="mt-2 text-sm text-espresso/65">
            {register
              ? "Daftar sebagai penikmat kopi atau pemilik kedai."
              : "Masuk untuk melanjutkan pengalamanmu."}
          </p>

          <form onSubmit={submit} className="mt-7 grid gap-4">
            {register && (
              <Field label="Nama lengkap" value={form.name} onChange={(value) => set("name", value)} />
            )}
            {register && (
              <label className="grid gap-2 text-sm font-bold">
                Daftar sebagai
                <select
                  value={form.role}
                  onChange={(event) => set("role", event.target.value)}
                  className="rounded-xl border border-espresso/15 px-3 py-3 font-normal"
                >
                  <option value="USER">User</option>
                  <option value="OWNER">Owner</option>
                </select>
              </label>
            )}
            <Field label="Email" type="email" value={form.email} onChange={(value) => set("email", value)} />
            <Field label="Password" type="password" value={form.password} onChange={(value) => set("password", value)} />
            {register && (
              <Field
                label="Konfirmasi password"
                type="password"
                value={form.confirm}
                onChange={(value) => set("confirm", value)}
              />
            )}
            {!register && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) => set("remember", event.target.checked)}
                  />
                  Ingat saya
                </label>
                <a href="#lupa-password" className="font-bold text-terracotta">
                  Lupa password?
                </a>
              </div>
            )}
            {message && <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">{message}</p>}
            <button
              disabled={loading}
              className="rounded-xl bg-terracotta py-3 font-bold text-white disabled:opacity-60"
            >
              {loading ? "Memproses..." : register ? "Daftar" : "Masuk"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-espresso/65">
            {register ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <Link className="font-bold text-terracotta" to={register ? "/login" : "/register"}>
              {register ? "Masuk" : "Daftar sekarang"}
            </Link>
          </p>
        </section>
      </main>
    </MainLayout>
  );
}