"use client";

import { useI18n } from "@/components/LocaleProvider";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return <main className="grid min-h-screen place-items-center px-5 text-center"><div className="data-card w-full max-w-lg p-9"><p className="page-eyebrow">NOVA TYPE</p><h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{t("error.title")}</h1><p className="mt-2 text-sm leading-6 text-nova-muted">{t("error.subtitle")}</p><button className="nova-button mt-6" onClick={reset}>{t("error.retry")}</button></div></main>;
}
