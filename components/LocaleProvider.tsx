"use client";

import { createContext, useContext } from "react";
import { type InterfaceLocale, translate } from "@/lib/i18n-shared";

const LocaleContext = createContext<InterfaceLocale>("ru");

export function LocaleProvider({ locale, children }: { locale: InterfaceLocale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  return { locale, t: (key: string) => translate(locale, key) };
}
