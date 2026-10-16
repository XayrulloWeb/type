import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getI18n } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const robotoMono = Roboto_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-roboto-mono" });

export const metadata: Metadata = {
  title: "NOVA TYPE",
  description: "School Typing Trainer",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="min-h-screen bg-nova-bg font-sans text-nova-text antialiased selection:bg-nova-accent selection:text-nova-bg">
        <LocaleProvider locale={locale}><Providers>{children}</Providers></LocaleProvider>
      </body>
    </html>
  );
}
