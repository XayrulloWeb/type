"use client";

import { FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound, Sparkles } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";

export default function ChangePasswordPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const { locale } = useI18n();
  const ui = locale === "uz" ? { mismatch: "Parollar mos emas.", error: "Xatolik yuz berdi. Qayta urinib ko‘ring.", title: "Yangi parol yarating", subtitle: "Berilgan parolni o‘zgartirish majburiy emas.", password: "Yangi parol", confirm: "Parolni tasdiqlang", saving: "Saqlanmoqda...", continue: "Davom etish" } : { mismatch: "Пароли не совпадают.", error: "Произошла ошибка. Попробуйте ещё раз.", title: "Создайте новый пароль", subtitle: "Изменять выданный пароль необязательно.", password: "Новый пароль", confirm: "Подтвердите пароль", saving: "Сохранение...", continue: "Продолжить" };

  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage(ui.mismatch);
      return;
    }

    setPending(true);
    setMessage("");
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? ui.error);
      setPending(false);
      return;
    }

    await update({ mustChangePassword: false });
    const destination = session?.user.role === "SUPER_ADMIN" ? "/admin" : session?.user.role === "TEACHER" ? "/teacher" : "/typing";
    router.replace(destination);
    router.refresh();
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-nova-accent/[0.07] blur-3xl" />
      <form onSubmit={submit} className="data-card relative w-full max-w-md p-7 sm:p-8">
        <div className="mb-7 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-nova-accent"><Sparkles size={13} /> NOVA TYPE</span><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-nova-accent"><KeyRound size={17} /></span></div>
        <h1 className="text-2xl font-semibold tracking-[-0.035em]">{ui.title}</h1>
        <p className="mt-2 text-sm text-nova-muted">{ui.subtitle}</p>
        <div className="mt-8 space-y-4">
          <input className="nova-input" type="password" autoComplete="new-password" placeholder={ui.password} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <input className="nova-input" type="password" autoComplete="new-password" placeholder={ui.confirm} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        </div>
        {message && <p className="mt-4 text-sm text-nova-error" aria-live="polite">{message}</p>}
        <button className="nova-button mt-6 w-full" disabled={pending || status === "loading"}>{pending ? ui.saving : ui.continue}</button>
      </form>
    </main>
  );
}
