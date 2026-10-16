import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, ExternalLink, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getI18n } from "@/lib/i18n";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/login");
  const { t } = await getI18n();
  const nav = [
    { href: "/admin", label: t("admin.overview"), icon: "gauge" as const },
    { href: "/admin/students", label: t("admin.students"), icon: "users" as const },
    { href: "/admin/classes", label: t("admin.classes"), icon: "classes" as const },
    { href: "/admin/texts", label: t("admin.texts"), icon: "texts" as const },
    { href: "/admin/assignments", label: t("admin.assignments"), icon: "assignments" as const },
    { href: "/admin/olympiads", label: "Олимпиады", icon: "olympiads" as const },
    { href: "/admin/review", label: t("admin.review"), icon: "review" as const },
    { href: "/admin/activity", label: t("admin.activity"), icon: "activity" as const },
  ];
  return <div className="min-h-screen lg:flex">
    <aside className="border-b border-white/[0.06] bg-[#101213]/90 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:z-30 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3"><Link href="/admin" className="group flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-nova-accent/20 bg-nova-accent/[0.07] text-nova-accent transition group-hover:bg-nova-accent/10"><Sparkles size={15} /></span><span className="text-[0.68rem] font-extrabold tracking-[0.28em]"><span className="text-nova-accent">NOVA</span> ADMIN</span></Link><div className="flex items-center gap-1.5"><LocaleSwitcher compact /><Link href="/typing" className="grid h-10 w-10 place-items-center rounded-xl border border-nova-accent/25 bg-gradient-to-br from-nova-accent/[0.18] to-nova-accent/[0.05] text-nova-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_22px_rgba(227,182,75,0.1)] transition hover:-translate-y-0.5 hover:border-nova-accent/45 hover:bg-nova-accent/20 lg:hidden" title={t("admin.openStudent")} aria-label={t("admin.openStudent")}><ExternalLink size={16} /></Link><SignOutButton compact /></div></div>
        <div className="mt-6 hidden items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 lg:flex"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-nova-accent/20 to-nova-accent/[0.04] text-xs font-bold text-nova-accent">A</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-nova-text">Super Admin</span><span className="mt-0.5 block text-[9px] uppercase tracking-[0.12em] text-nova-muted">NOVA TYPE</span></span></div>
        <Link href="/typing" className="mt-3 hidden w-full items-center justify-between rounded-xl border border-nova-accent/20 bg-gradient-to-r from-nova-accent/[0.11] to-nova-accent/[0.035] px-3.5 py-3 text-[11px] font-semibold text-nova-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:-translate-y-0.5 hover:border-nova-accent/35 hover:from-nova-accent/[0.16] hover:to-nova-accent/[0.06] lg:flex"><span>Открыть сайт ученика</span><ExternalLink size={14} /></Link>
      </div>
      <div className="mx-5 mb-4 hidden h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent lg:block" />
      <AdminNavigation items={nav} />
      <div className="absolute bottom-6 left-5 right-5 hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-[10px] leading-5 text-nova-muted shadow-inner lg:block"><div className="mb-1.5 flex items-center gap-2 font-semibold text-nova-text"><BarChart3 className="text-nova-accent" size={13} /> NOVA TYPE</div>{t("admin.schoolAdmin")}</div>
    </aside>
    <main className="min-w-0 flex-1 p-5 sm:p-8 lg:ml-64 lg:p-10 xl:p-12">{children}</main>
  </div>;
}
