import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Coins, Gamepad2, LockKeyhole, ShoppingBag, Sparkles, Star, Zap } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db";
import { DEFENSE_SHOP_ITEMS } from "@/lib/defense-shop";
import { getDefensePlayerProgress } from "@/lib/defense-progress";
import { purchaseDefenseItem } from "./actions";

export default async function DefenseShopPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string; item?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const [query, user] = await Promise.all([
    searchParams,
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } }),
  ]);
  if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) redirect("/login");

  const isAdmin = user.role === "SUPER_ADMIN";
  const [progress, purchases] = await Promise.all([
    getDefensePlayerProgress(session.user.id, isAdmin),
    prisma.gamePurchase.findMany({ where: { userId: session.user.id }, select: { itemId: true } }),
  ]);
  const owned = new Set(purchases.map((purchase) => purchase.itemId));
  const message = query.status === "bought"
    ? "Покупка завершена. Новая арена уже доступна в настройках миссии."
    : query.status === "owned"
      ? "Этот предмет уже находится в вашей коллекции."
      : query.error === "credits"
        ? "Недостаточно NOVA Credits. Завершайте миссии и побеждайте командиров."
        : query.error
          ? "Покупку не удалось завершить. Попробуйте ещё раз."
          : null;

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell !max-w-[86rem]">
    <section className="relative overflow-hidden rounded-[2rem] border border-nova-accent/15 bg-[#0a1012] shadow-[0_35px_100px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0 bg-[url('/games/nova-defense-cyber-city.webp')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#070b0d] via-[#070b0d]/92 to-[#070b0d]/42" />
      <div className="relative grid gap-8 px-7 py-12 sm:px-11 lg:grid-cols-[1fr_22rem] lg:items-end lg:py-16">
        <div>
          <Link href="/games" className="inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white"><ArrowLeft size={14} /> Игровой центр</Link>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-nova-accent/20 bg-nova-accent/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-nova-accent"><ShoppingBag size={12} /> NOVA Armory</div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Магазин защитника</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/52">Открывайте новые арены за кредиты, заработанные в NOVA Defense. Покупка остаётся у вашего аккаунта навсегда и не влияет на честность рейтинга.</p>
        </div>
        <div className="rounded-2xl border border-nova-accent/20 bg-black/40 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">Ваш баланс</span><Coins size={19} className="text-nova-accent" /></div>
          <div className="mt-4 text-4xl font-semibold text-nova-accent">{progress.credits.toLocaleString("ru-RU")}</div>
          <div className="mt-1 text-xs font-semibold">NOVA Credits</div>
          <div className="mt-4 border-t border-white/[0.07] pt-4 text-[10px] leading-5 text-white/35">{isAdmin ? "Администратор получает двойные кредиты за каждую сохранённую миссию." : "Кредиты начисляются за подтверждённые рейтинговые миссии."}</div>
        </div>
      </div>
    </section>

    {message && <div className={query.error ? "mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-100" : "mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-5 py-4 text-sm text-emerald-100"}>{message}</div>}

    <section className="mt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="page-eyebrow">Коллекция арен</p><h2 className="mt-1 text-2xl font-semibold">Выберите атмосферу боя</h2></div><div className="text-xs text-nova-muted">{purchases.length + 1} из {DEFENSE_SHOP_ITEMS.length + 1} арен открыто</div></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <StoreCard
          title="NOVA Prime"
          subtitle="Золотое ядро"
          description="Базовая арена каждого защитника. Сбалансированное оформление и фирменная музыка NOVA."
          image="/games/nova-defense-arena.webp"
          price={0}
          owned
        />
        {DEFENSE_SHOP_ITEMS.map((item) => <StoreCard key={item.id} {...item} owned={owned.has(item.id)} affordable={progress.credits >= item.price} balance={progress.credits} />)}
      </div>
    </section>

    <section className="mt-8 grid gap-4 lg:grid-cols-3">
      <InfoCard icon={<Zap size={19} />} title={isAdmin ? "Награда ×2" : "Зарабатывайте"} text={isAdmin ? "Личные миссии администратора дают вдвое больше кредитов и не входят в рейтинг учеников." : "Чем выше очки, больше командиров и звёзд — тем больше кредитов за миссию."} />
      <InfoCard icon={<LockKeyhole size={19} />} title="Покупка навсегда" text="Открытая арена сохраняется в аккаунте и доступна с любого устройства после входа." />
      <InfoCard icon={<Star size={19} />} title="Только косметика" text="Оформление и музыка меняются, но скорость целей и место в рейтинге остаются честными." />
    </section>

    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/games/defense" className="nova-button !min-h-12 !rounded-xl"><Gamepad2 size={17} /> Перейти в игру</Link><Link href="/games" className="nova-button-secondary !min-h-12 !rounded-xl">Игровой рейтинг</Link></div>
  </main></div>;
}

function StoreCard({ id, title, subtitle, description, image, price, owned, affordable = true, balance = 0 }: { id?: string; title: string; subtitle: string; description: string; image: string; price: number; owned: boolean; affordable?: boolean; balance?: number }) {
  return <article className={owned ? "group relative overflow-hidden rounded-[1.6rem] border border-emerald-400/18 bg-[#0c1214]" : "group relative overflow-hidden rounded-[1.6rem] border border-white/[0.09] bg-[#0c1214]"}>
    <div className="relative h-56 overflow-hidden"><div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${image})` }} /><div className="absolute inset-0 bg-gradient-to-t from-[#0c1214] via-transparent to-black/10" /><div className="absolute left-4 top-4">{owned ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-[#07100d]/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md"><Check size={11} /> Открыто</span> : <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/55 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/68 backdrop-blur-md"><LockKeyhole size={11} /> Закрыто</span>}</div></div>
    <div className="p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-semibold">{title}</h3><p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-nova-accent">{subtitle}</p></div>{price > 0 && <div className="flex items-center gap-1.5 rounded-xl border border-nova-accent/18 bg-nova-accent/[0.06] px-3 py-2 text-sm font-semibold text-nova-accent"><Coins size={14} /> {price}</div>}</div><p className="mt-4 min-h-16 text-xs leading-6 text-nova-muted">{description}</p>
      {owned ? <div className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] text-xs font-semibold text-emerald-200"><Check size={15} /> В коллекции</div> : <form action={purchaseDefenseItem} className="mt-5"><input type="hidden" name="itemId" value={id} /><button className="nova-button !min-h-11 !w-full !rounded-xl" type="submit"><Sparkles size={15} /> Купить за {price}</button>{!affordable && <p className="mt-2 text-center text-[9px] text-white/30">Не хватает {(price - balance).toLocaleString("ru-RU")} кредитов</p>}</form>}
    </div>
  </article>;
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="data-card p-5"><span className="grid h-10 w-10 place-items-center rounded-xl border border-nova-accent/18 bg-nova-accent/[0.07] text-nova-accent">{icon}</span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-nova-muted">{text}</p></div>;
}
