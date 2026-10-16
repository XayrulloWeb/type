"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "next-auth";
import { BarChart3, BookOpenText, ChevronDown, ClipboardList, History, Keyboard, Sparkles, Trophy, UserRound } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useI18n } from "@/components/LocaleProvider";

export function Header({ user, hidden = false }: { user?: User; hidden?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();
  if (hidden) return null;

  const navItems = [
    { href: "/typing", icon: Keyboard, label: t("nav.practice") },
    { href: "/texts", icon: BookOpenText, label: t("nav.texts") },
    { href: "/assignments", icon: ClipboardList, label: t("nav.assignments") },
    { href: "/olympiads", icon: Trophy, label: "Олимпиада" },
    { href: "/leaderboard/class", icon: BarChart3, label: t("nav.leaderboard") },
    { href: "/history", icon: History, label: t("nav.history") },
    { href: "/profile", icon: UserRound, label: t("nav.profile") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.055] bg-[#0c0e0f]/82 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1536px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
      <Link href="/typing" className="group flex shrink-0 items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-nova-accent/20 bg-nova-accent/[0.07] text-nova-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition group-hover:border-nova-accent/35 group-hover:bg-nova-accent/10"><Sparkles size={15} /></span>
        <span className="text-[0.7rem] font-extrabold tracking-[0.31em]"><span className="text-nova-accent">NOVA</span> <span className="text-nova-text">TYPE</span></span>
      </Link>

      <nav className="hidden items-center gap-0.5 rounded-xl border border-white/[0.045] bg-white/[0.018] p-1 lg:flex" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href) || (item.href.includes("leaderboard") && pathname.startsWith("/leaderboard"));
          return (
            <Link key={item.href} href={item.href} className={clsx("nav-link", active && "nav-link-active")}>
              <item.icon size={14} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <LocaleSwitcher compact />
        <SignOutButton className="hidden shrink-0 sm:inline-flex" />
        <div className="relative">
          <button onClick={() => setMenuOpen((open) => !open)} className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 text-left transition hover:border-white/[0.07] hover:bg-white/[0.035]" aria-expanded={menuOpen}>
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.07] bg-gradient-to-br from-[#232729] to-[#151719] text-xs font-semibold text-nova-accent shadow-inner">
            {(user?.firstName || user?.username || "N")[0]?.toUpperCase()}
          </span>
          <span className="hidden min-w-20 sm:block">
            <span className="flex items-center gap-1 text-xs font-semibold text-nova-text">{user?.firstName || user?.username || "Student"}<ChevronDown className={clsx("transition-transform", menuOpen && "rotate-180")} size={12} /></span>
            <span className="block text-[10px] text-nova-muted">{user?.role === "SUPER_ADMIN" ? t("role.admin") : user?.className ?? t("role.noClass")}</span>
          </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/[0.09] bg-[#151819]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {user?.role === "SUPER_ADMIN" && <Link className="menu-item" href="/admin">{t("nav.admin")}</Link>}
              <div className="lg:hidden">{navItems.map((item) => <Link key={item.href} className={clsx("menu-item", (pathname.startsWith(item.href) || (item.href.includes("leaderboard") && pathname.startsWith("/leaderboard"))) && "bg-nova-accent/[0.07] text-nova-accent")} href={item.href} onClick={() => setMenuOpen(false)}><item.icon size={15} />{item.label}</Link>)}</div>
              <div className="mt-1 border-t border-white/[0.06] pt-1 sm:hidden"><SignOutButton className="w-full border-0 px-3" /></div>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
