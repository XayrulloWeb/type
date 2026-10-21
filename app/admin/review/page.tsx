import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, ArrowUpRight, Clock3, Gauge, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { reviewResult } from "./actions";
import { getI18n } from "@/lib/i18n";
import { requireSuperAdminPage } from "@/lib/admin";

const reasonLabels: Record<string, { ru: string; uz: string }> = {
  extreme_personal_jump: { ru: "скачок на 25+ WPM", uz: "25+ WPM keskin o‘sish" },
  personal_best_jump: { ru: "рост более чем на 40%", uz: "40% dan ortiq o‘sish" },
  recent_median_spike: { ru: "намного выше последних попыток", uz: "so‘nggi urinishlardan ancha yuqori" },
  grade_outlier: { ru: "намного выше нормы класса", uz: "sinf me’yoridan ancha yuqori" },
  short_test_record: { ru: "резкий рекорд на коротком тесте", uz: "qisqa testdagi keskin rekord" },
  low_accuracy_record: { ru: "рекорд с низкой точностью", uz: "past aniqlikdagi rekord" },
  large_raw_gap: { ru: "большой разрыв сырой и чистой скорости", uz: "xom va toza tezlik orasida katta farq" },
  impossible_burst: { ru: "неестественно быстрый всплеск нажатий", uz: "g‘ayritabiiy tez bosishlar" },
  uniform_timing: { ru: "слишком равномерный ритм", uz: "haddan tashqari bir xil ritm" },
  focus_lost: { ru: "многократная потеря фокуса", uz: "fokus ko‘p marta yo‘qolgan" },
  paste_attempt: { ru: "попытка вставки текста", uz: "matn joylashga urinish" },
  unrealistic_speed: { ru: "нереальная скорость", uz: "haqiqatga to‘g‘ri kelmaydigan tezlik" },
  duration_too_short: { ru: "слишком короткое время", uz: "vaqt juda qisqa" },
  incomplete_timer: { ru: "таймер не завершён", uz: "taymer tugallanmagan" },
  accuracy_too_low: { ru: "точность ниже 70%", uz: "aniqlik 70% dan past" },
};

export default async function ReviewPage() {
  await requireSuperAdminPage();
  const [results, { locale }] = await Promise.all([
    prisma.testResult.findMany({
      where: { reviewStatus: "pending", language: { in: ["ru", "en"] } },
      include: {
        user: {
          include: {
            class: true,
            testResults: {
              where: { language: { in: ["ru", "en"] } },
              orderBy: { createdAt: "desc" },
              take: 8,
              select: { id: true, wpm: true, accuracy: true, language: true, isRanked: true, reviewStatus: true, createdAt: true },
            },
          },
        },
      },
      orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
    }),
    getI18n(),
  ]);
  const uz = locale === "uz";
  const ui = uz
    ? { eyebrow: "Anti-cheat", title: "Shubhali natijalar", subtitle: "Tekshiruv tugamaguncha bu natijalar reytingga kirmaydi.", pending: "tekshiruvda", previousBest: "Oldingi rekord", baseline: "So‘nggi mediana", jump: "O‘sish", history: "So‘nggi urinishlar", approve: "Tasdiqlash", reject: "Bekor qilish", profile: "Profil", empty: "Tekshiriladigan natijalar yo‘q.", medium: "O‘rta xavf", high: "Yuqori xavf" }
    : { eyebrow: "Античит", title: "Подозрительные результаты", subtitle: "До решения администратора эти результаты не участвуют в рейтинге.", pending: "на проверке", previousBest: "Предыдущий рекорд", baseline: "Медиана последних", jump: "Скачок", history: "Последние попытки", approve: "Одобрить", reject: "Аннулировать", profile: "Профиль", empty: "Подозрительных результатов сейчас нет.", medium: "Средний риск", high: "Высокий риск" };

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="page-eyebrow">{ui.eyebrow}</p><h1 className="page-title">{ui.title}</h1><p className="page-subtitle">{ui.subtitle}</p></div>
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-5 py-3 text-right"><div className="text-2xl font-semibold text-amber-300">{results.length}</div><div className="text-[9px] uppercase tracking-wider text-nova-muted">{ui.pending}</div></div>
    </div>

    <div className="mt-8 space-y-4">
      {results.map((result) => {
        const reasons = parseReasons(result.reviewReasons);
        const previousBest = result.previousBestWpm;
        const baseline = result.baselineWpm;
        const difference = previousBest === null ? null : result.wpm - previousBest;
        const percent = previousBest && difference !== null ? Math.round(difference / previousBest * 100) : null;
        const recent = result.user.testResults.filter((item) => item.id !== result.id).slice(0, 6);
        const highRisk = result.riskScore >= 5;
        return <article key={result.id} className="data-card overflow-hidden">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between lg:p-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={highRisk ? "inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300" : "inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300"}><ShieldAlert size={12} />{highRisk ? ui.high : ui.medium} · {result.riskScore}/10</span>
                <span className="text-xs text-nova-muted">{format(result.createdAt, "dd.MM.yyyy · HH:mm")}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="text-xl font-semibold text-nova-text">{result.user.firstName} {result.user.lastName}</h2><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-nova-muted">{result.user.class?.name ?? "—"}</span><span className="font-mono text-xs text-nova-muted">{result.user.username}</span></div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Metric icon={<Gauge size={14} />} value={`${result.wpm} WPM`} label={result.language.toUpperCase()} accent />
                <Metric value={`${result.accuracy.toFixed(0)}%`} label={uz ? "Aniqlik" : "Точность"} />
                <Metric value={previousBest === null ? "—" : `${previousBest} WPM`} label={ui.previousBest} />
                <Metric value={baseline === null ? "—" : `${baseline} WPM`} label={ui.baseline} />
                <Metric value={difference === null ? "—" : `+${difference} · ${percent}%`} label={ui.jump} danger={difference !== null && difference >= 15} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">{reasons.map((reason) => <span key={reason} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-2.5 py-1.5 text-[11px] text-amber-200"><AlertTriangle size={11} />{reasonLabels[reason]?.[uz ? "uz" : "ru"] ?? reason}</span>)}</div>

              <div className="mt-5"><div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-nova-muted"><Clock3 size={12} />{ui.history}</div><div className="flex flex-wrap gap-2">{recent.map((item) => <span key={item.id} className={item.isRanked ? "rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-xs text-nova-muted" : "rounded-lg border border-amber-400/10 bg-amber-400/[0.03] px-2.5 py-1.5 text-xs text-nova-muted"}><b className="text-nova-text">{item.wpm}</b> WPM · {item.accuracy.toFixed(0)}% · {item.language.toUpperCase()}</span>)}{recent.length === 0 && <span className="text-xs text-nova-muted">—</span>}</div></div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 lg:w-44 lg:flex-col">
              <Link href={`/admin/students/${result.userId}`} className="nova-button-secondary justify-center"><ArrowUpRight size={14} />{ui.profile}</Link>
              <form action={reviewResult}><input type="hidden" name="id" value={result.id} /><input type="hidden" name="decision" value="approved" /><input type="hidden" name="reason" value="manual_review" /><button className="nova-button w-full justify-center">{ui.approve}</button></form>
              <form action={reviewResult}><input type="hidden" name="id" value={result.id} /><input type="hidden" name="decision" value="rejected" /><input type="hidden" name="reason" value="suspicious_speed" /><button className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.12]">{ui.reject}</button></form>
            </div>
          </div>
        </article>;
      })}
      {results.length === 0 && <div className="data-card p-16 text-center text-nova-muted">{ui.empty}</div>}
    </div>
  </div>;
}

function parseReasons(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function Metric({ value, label, icon, accent = false, danger = false }: { value: string; label: string; icon?: React.ReactNode; accent?: boolean; danger?: boolean }) {
  return <div className="rounded-xl border border-white/[0.05] bg-black/10 p-3"><div className={`flex items-center gap-1.5 text-lg font-semibold ${danger ? "text-red-300" : accent ? "text-nova-accent" : "text-nova-text"}`}>{icon}{value}</div><div className="mt-1 text-[9px] uppercase tracking-wider text-nova-muted">{label}</div></div>;
}
