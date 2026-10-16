import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Header } from "@/components/Header";
import { TextLibrary } from "@/components/texts/TextLibrary";
import { getI18n } from "@/lib/i18n";

export default async function TextsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/admin/texts");
  const [{ t }, user, texts] = await Promise.all([
    getI18n(),
    prisma.user.findUnique({ where: { id: session.user.id }, include: { class: true } }),
    prisma.text.findMany({ where: { isActive: true, language: { in: ["ru", "en"] } }, orderBy: [{ grade: "asc" }, { language: "asc" }, { difficulty: "asc" }] }),
  ]);
  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell"><p className="page-eyebrow">{t("texts.eyebrow")}</p><h1 className="page-title">{t("texts.title")}</h1><p className="page-subtitle">{t("texts.subtitle")}</p><TextLibrary texts={texts.map((text) => ({ id: text.id, title: text.title, content: text.content, language: text.language, difficulty: text.difficulty, grade: text.grade }))} initialGrade={user?.class?.grade ?? null} /></main></div>;
}
