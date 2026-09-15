import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "../../layouts/MainLayout";
import { ApiError, login, register as registerAccount } from "../../services/auth";

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
    <label className="grid gap-2 text-sm font-bold text-slate-900">
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-600 transition shadow-2xs text-slate-950"
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
  const [isShaking, setIsShaking] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (register && form.name.trim().length < 2) {
      setMessage("Nama minimal terdiri dari 2 karakter.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setMessage("Masukkan alamat email yang valid.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    if (form.password.length < 8) {
      setMessage("Password minimal terdiri dari 8 karakter.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    if (register && form.password !== form.confirm) {
      setMessage("Konfirmasi password belum sama.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const session = register
        ? await registerAccount({ name: form.name, email: form.email, password: form.password, role: form.role })
        : await login(form.email, form.password);
      localStorage.setItem("ngopi_jember_token", session.token);
      localStorage.setItem("ngopi_jember_user", JSON.stringify(session.user));
      if (session.user.role === "OWNER") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Tidak dapat terhubung ke server. Coba lagi.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto grid min-h-[65vh] max-w-5xl items-center gap-10 px-5 py-14 md:grid-cols-2"
      >
        <section className="hidden rounded-3xl bg-slate-900 p-10 text-slate-100 md:block shadow-xl">
          <p className="font-mono text-xs font-bold text-indigo-400 tracking-wider">NGOPI JEMBER</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">
            {register ? "Mulai ceritakan kedaimu." : "Selamat datang kembali."}
          </h1>
          <p className="mt-5 leading-7 text-slate-300 font-medium">
            Satu tempat untuk menemukan dan membagikan pengalaman ngopi
            terbaik di Jember.
          </p>
        </section>

        <section className={`rounded-3xl bg-white p-7 shadow-xl ring-1 ring-slate-300 sm:p-9 ${isShaking ? "animate-shake" : ""}`}>
          <h1 className="text-3xl font-black text-slate-950">{register ? "Buat akun" : "Masuk"}</h1>
          <p className="mt-2 text-sm text-slate-800 font-medium">
            {register
              ? "Daftar sebagai penikmat kopi atau pemilik kedai."
              : "Masuk untuk melanjutkan pengalamanmu."}
          </p>

          <form onSubmit={submit} className="mt-7 grid gap-4">
            {register && (
              <Field label="Nama lengkap" value={form.name} onChange={(value) => set("name", value)} />
            )}
            {register && (
              <label className="grid gap-2 text-sm font-bold text-slate-900">
                Daftar sebagai
                <select
                  value={form.role}
                  onChange={(event) => set("role", event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-600 bg-white text-slate-950"
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
              <div className="flex items-center justify-between text-sm font-medium">
                <label className="flex items-center gap-2 cursor-pointer text-slate-900">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) => set("remember", event.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Ingat saya
                </label>
                <a href="#lupa-password" className="font-bold text-indigo-600 hover:underline">
                  Lupa password?
                </a>
              </div>
            )}
            {message && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</p>}
            <button
              disabled={loading}
              className="rounded-xl bg-indigo-600 py-3.5 font-bold text-white shadow-md hover:bg-indigo-500 hover:scale-[1.02] active:scale-95 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              )}
              {loading ? "Memproses..." : register ? "Daftar" : "Masuk"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-800 font-medium">
            {register ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <Link className="font-bold text-indigo-600 underline" to={register ? "/login" : "/register"}>
              {register ? "Masuk" : "Daftar sekarang"}
            </Link>
          </p>
        </section>
      </motion.main>
    </MainLayout>
  );
}