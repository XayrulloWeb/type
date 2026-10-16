"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/components/LocaleProvider";

export function SignOutButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const { t } = useI18n();

  return (
    <button
      type="button"
      className={clsx("inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 text-xs font-medium text-nova-muted transition hover:border-white/20 hover:bg-white/5 hover:text-nova-text disabled:opacity-50", compact ? "h-9 w-9 p-0" : "px-3 py-2", className)}
      disabled={pending}
      title={pending ? t("nav.loggingOut") : t("nav.logout")}
      aria-label={pending ? t("nav.loggingOut") : t("nav.logout")}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: "/login" });
      }}
    >
      <LogOut size={14} aria-hidden />
      {!compact && <span>{pending ? t("nav.loggingOut") : t("nav.logout")}</span>}
    </button>
  );
}
