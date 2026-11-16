"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { User } from "next-auth";
import { BarChart3, BookOpenText, ChevronDown, ClipboardList, Gamepad2, History, Keyboard, Sparkles, Trophy, UserRound } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useI18n } from "@/components/LocaleProvider";

export function Header({ user, hidden = false }: { user?: User; hidden?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [decoration, setDecoration] = useState<HeaderDecoration | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    fetch("/api/profile/header", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<HeaderDecoration> : null)
      .then((value) => { if (value) setDecoration(value); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [user?.id]);

  if (hidden) return null;

  const navItems = [
    { href: "/typing", icon: Keyboard, label: t("nav.practice") },
    { href: "/games", icon: Gamepad2, label: t("nav.games") },
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
          <span className={headerAvatarClass(decoration?.frame)}>
            {decoration?.avatarUrl
              ? <Image src={decoration.avatarUrl} alt="" width={36} height={36} unoptimized={decoration.avatarUrl.startsWith("/uploads/")} className="h-full w-full rounded-[0.62rem] object-cover" />
              : (user?.firstName || user?.username || "N")[0]?.toUpperCase()}
          </span>
          <span className="hidden min-w-20 sm:block">
            <span className="flex items-center gap-1 text-xs font-semibold text-nova-text">{user?.firstName || user?.username || "Student"}<ChevronDown className={clsx("transition-transform", menuOpen && "rotate-180")} size={12} /></span>
            <span className="block max-w-32 truncate text-[10px] text-nova-muted">{user?.role === "SUPER_ADMIN" ? t("role.admin") : user?.className ?? t("role.noClass")}{decoration?.profileTitle ? ` · ${decoration.profileTitle}` : ""}</span>
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

interface HeaderDecoration {
  avatarUrl: string | null;
  frame: "none" | "solar" | "plasma" | "legend";
  profileTitle: string | null;
}

function headerAvatarClass(frame: HeaderDecoration["frame"] | undefined) {
  const base = "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#232729] to-[#151719] text-xs font-semibold text-nova-accent";
  if (frame === "solar") return `${base} border border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.42)]`;
  if (frame === "plasma") return `${base} border border-fuchsia-400 shadow-[0_0_14px_rgba(217,70,239,0.46),0_0_8px_rgba(34,211,238,0.4)]`;
  if (frame === "legend") return `${base} border border-white shadow-[0_0_10px_rgba(255,255,255,0.5),0_0_18px_rgba(251,191,36,0.42)]`;
  return `${base} border border-white/[0.07] shadow-inner`;
}
