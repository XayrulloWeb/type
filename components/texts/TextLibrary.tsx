"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenText, Search } from "lucide-react";
import { useI18n } from "@/components/LocaleProvider";

interface LibraryText { id: string; title: string; content: string; language: string; difficulty: string; grade: number | null }

export function TextLibrary({ texts, initialGrade }: { texts: LibraryText[]; initialGrade: number | null }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState(initialGrade ? String(initialGrade) : "all");
  const [language, setLanguage] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const filtered = useMemo(() => texts.filter((text) => {
    const matchesQuery = `${text.title} ${text.content}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (grade === "all" || text.grade === Number(grade)) && (language === "all" || text.language === language) && (difficulty === "all" || text.difficulty === difficulty);
  }), [difficulty, grade, language, query, texts]);

  return <>
    <div className="mt-8 grid gap-3 md:grid-cols-[1fr_150px_170px_190px]"><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-nova-muted" /><input className="nova-input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("texts.search")} /></label><select className="nova-input" value={grade} onChange={(event) => setGrade(event.target.value)}><option value="all">{t("texts.allGrades")}</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {t("texts.grade")}</option>)}</select><select className="nova-input" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="all">{t("texts.allLanguages")}</option>{["ru", "en"].map((item) => <option key={item} value={item}>{t(`language.${item}`)}</option>)}</select><select className="nova-input" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">{t("texts.allDifficulties")}</option>{["easy", "medium", "hard"].map((item) => <option key={item} value={item}>{t(`difficulty.${item}`)}</option>)}</select></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{filtered.map((text) => <article className="data-card flex flex-col p-6" key={text.id}><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-nova-accent">{text.grade} {t("texts.grade")} · {t(`language.${text.language}`)}</div><h2 className="mt-2 text-xl font-semibold">{text.title}</h2></div><BookOpenText size={22} className="shrink-0 text-nova-muted" /></div><p className="mt-4 line-clamp-4 text-sm leading-6 text-nova-muted">{text.content}</p><div className="mt-auto flex items-end justify-between pt-6"><span className="text-xs text-nova-muted">{t(`difficulty.${text.difficulty}`)} · {text.content.split(/\s+/).length} {t("texts.words")}</span><Link href={`/texts/${text.id}`} className="nova-button">{t("texts.start")}</Link></div></article>)}{filtered.length === 0 && <div className="data-card p-14 text-center text-nova-muted md:col-span-2">{t("texts.empty")}</div>}</div>
  </>;
}
