import "server-only";
import { cookies } from "next/headers";
import { normalizeLocale, translate } from "@/lib/i18n-shared";

export async function getI18n() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("nova_locale")?.value);
  return { locale, t: (key: string) => translate(locale, key) };
}
