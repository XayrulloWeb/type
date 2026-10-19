"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Keyboard, LockKeyhole, ShieldCheck, Sparkles, TriangleAlert, Trophy } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useI18n } from "@/components/LocaleProvider";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("login.error"));
      setLoading(false);
    } else {
      const session = await getSession();
      if (session?.user.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/typing");
      }
      router.refresh();
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden border-r border-white/[0.06] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-nova-accent/[0.07] blur-3xl" />
        <div className="relative flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-nova-accent/25 bg-nova-accent/[0.08] text-nova-accent"><Sparkles size={18} /></span><span className="text-xs font-extrabold tracking-[0.34em]"><span className="text-nova-accent">NOVA</span> TYPE</span></div>
        <div className="relative max-w-2xl pb-8">
          <div className="nova-badge"><Keyboard size={13} /> Школьная платформа печати</div>
          <h1 className="mt-7 text-[clamp(3.2rem,6vw,6.6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">Точность.<br /><span className="text-nova-accent">Скорость.</span><br />Прогресс.</h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-nova-muted">Современное пространство для тренировок, школьных рейтингов и олимпиад по быстрой печати.</p>
          <div className="mt-10 flex gap-7 text-xs text-nova-muted"><span className="flex items-center gap-2"><ShieldCheck className="text-nova-accent" size={15} /> Безопасные аккаунты</span><span className="flex items-center gap-2"><Trophy className="text-nova-accent" size={15} /> Честный рейтинг</span></div>
        </div>
        <div className="relative text-[10px] uppercase tracking-[0.22em] text-nova-muted">NOVA SCHOOL · 2026</div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
      <div className="w-full max-w-md">
        <div className="mb-9 lg:hidden"><div className="flex items-center justify-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-nova-accent/25 bg-nova-accent/[0.08] text-nova-accent"><Sparkles size={17} /></span><h1 className="text-xl font-bold tracking-[0.25em]"><span className="text-nova-accent">NOVA</span> TYPE</h1></div></div>
        <div className="data-card p-6 sm:p-8">
          <div className="mb-7"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-nova-accent"><LockKeyhole size={18} /></div><h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Вход в аккаунт</h2><p className="mt-2 text-sm leading-6 text-nova-muted">{t("login.subtitle")}</p><div className="mt-3"><LocaleSwitcher /></div></div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-nova-error/20 bg-nova-error/[0.08] p-3 text-center text-sm text-nova-error">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-nova-muted">{t("login.username")}</span>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              required
              placeholder={t("login.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="nova-input"
            />
            </label>
            <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-nova-muted">{t("login.password")}</span>
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                onBlur={() => setCapsLockOn(false)}
                className="nova-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-nova-muted transition hover:text-nova-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nova-accent/60"
                aria-label={t(showPassword ? "login.hidePassword" : "login.showPassword")}
                title={t(showPassword ? "login.hidePassword" : "login.showPassword")}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
            {capsLockOn && <span className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-400" role="status" aria-live="polite"><TriangleAlert size={14} /> {t("login.capsLock")}</span>}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="nova-button w-full"
          >
            {loading ? t("login.signingIn") : <>{t("login.signIn")}<ArrowRight size={15} /></>}
          </button>
        </form>
        </div>
        <p className="mt-5 text-center text-[11px] leading-5 text-nova-muted">Логин и пароль выдаёт администратор школы.<br />Если данные не подходят, обратитесь к нему.</p>
      </div>
      </section>
    </main>
  );
}
