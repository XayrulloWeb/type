"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, BookOpen, BookOpenText, ClipboardList, Gauge, ScrollText, ShieldCheck, Trophy, Users } from "lucide-react";

const icons = { gauge: Gauge, ranking: BarChart3, users: Users, classes: BookOpen, texts: BookOpenText, assignments: ClipboardList, olympiads: Trophy, review: ShieldCheck, activity: ScrollText } as const;

export interface AdminNavItem {
  href: string;
  label: string;
  icon: keyof typeof icons;
}

export function AdminNavigation({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return <nav className="flex gap-1 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:px-4 lg:pb-0">
    {items.map((item) => {
      const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
      const Icon = icons[item.icon];
      return <Link key={item.href} href={item.href} className={clsx("group relative flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium transition", active ? "bg-nova-accent/[0.09] text-nova-accent shadow-[inset_0_0_0_1px_rgba(227,182,75,0.14)]" : "text-nova-muted hover:bg-white/[0.035] hover:text-nova-text")}>
        {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-nova-accent shadow-[0_0_10px_rgba(227,182,75,0.55)]" />}
        <Icon size={16} className="transition-transform group-hover:scale-105" />
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
