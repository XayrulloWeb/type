import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Badge, Check, CircleUserRound, Coins, Frame, Gamepad2, Gem, ImageIcon, Layers3, LockKeyhole, Music2, Orbit, Search, ShoppingBag, Sparkles, Star, X, Zap } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db";
import { DEFENSE_CATEGORY_COPY, DEFENSE_SHOP_ITEMS, getDefenseShopItem, isCustomUploadItem, normalizeDefenseLoadout, type DefenseShopCategory, type DefenseShopItem, type DefenseShopRarity } from "@/lib/defense-shop";
import { getDefensePlayerProgress } from "@/lib/defense-progress";
import { ShopItemAction, ShopMediaUpload } from "@/components/games/ShopInteractiveForms";

const categories: DefenseShopCategory[] = ["arena", "laser", "core", "burst", "music", "avatar", "frame", "banner", "profileTitle"];

const collections = [
  {
    id: "aurora",
    title: "Aurora Expedition",
    subtitle: "Северное сияние",
    description: "Ледяной мир, изумрудная энергия и персонажи полярной экспедиции.",
    image: "/games/nova-defense-aurora-taiga.webp",
    accent: "from-emerald-400/22 via-cyan-400/8",
    itemIds: ["arena-aurora-taiga", "laser-aurora", "core-aurora", "burst-aurora", "music-floating-cities", "avatar-aurora-leopard", "frame-aurora", "banner-aurora-taiga", "title-aurora-pilot"],
  },
  {
    id: "forge",
    title: "Crimson Forge",
    subtitle: "Огненная кузница",
    description: "Лава, обсидиан и самые мощные красно-золотые эффекты NOVA.",
    image: "/games/nova-defense-crimson-forge.webp",
    accent: "from-red-500/24 via-orange-400/8",
    itemIds: ["arena-crimson-forge", "laser-ember", "core-magma", "burst-meteor", "music-new-hero", "avatar-obsidian-dragon", "frame-inferno", "banner-crimson-forge", "title-forge-phoenix"],
  },
  {
    id: "abyss",
    title: "Abyss Academy",
    subtitle: "Океанская лаборатория",
    description: "Глубокий океан, жемчужные реакторы и редчайшее голубое свечение.",
    image: "/games/nova-defense-abyss-academy.webp",
    accent: "from-sky-500/24 via-violet-400/8",
    itemIds: ["arena-abyss-academy", "laser-prism", "core-abyss", "burst-tide", "music-neon-horizon", "avatar-cyber-owl", "frame-abyss", "banner-abyss-academy", "title-abyss-guardian"],
  },
] as const;

type ShopQuery = {
  status?: string | string[];
  error?: string | string[];
  item?: string | string[];
  q?: string | string[];
  category?: string | string[];
  rarity?: string | string[];
  owned?: string | string[];
  collection?: string | string[];
};

export default async function DefenseShopPage({ searchParams }: { searchParams: Promise<ShopQuery> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const [query, user] = await Promise.all([
    searchParams,
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, archivedAt: true } }),
  ]);
  if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) redirect("/login");

  const status = firstQueryValue(query.status);
  const error = firstQueryValue(query.error);
  const changedItemId = firstQueryValue(query.item);
  const search = firstQueryValue(query.q).trim();
  const categoryQuery = firstQueryValue(query.category);
  const rarityQuery = firstQueryValue(query.rarity);
  const collectionQuery = firstQueryValue(query.collection);
  const selectedCategory = categories.includes(categoryQuery as DefenseShopCategory) ? categoryQuery as DefenseShopCategory : null;
  const selectedRarity = (["base", "rare", "epic", "legendary"] as DefenseShopRarity[]).includes(rarityQuery as DefenseShopRarity) ? rarityQuery as DefenseShopRarity : null;
  const selectedCollection = collections.find((collection) => collection.id === collectionQuery) ?? null;
  const ownedOnly = firstQueryValue(query.owned) === "1";

  const isAdmin = user.role === "SUPER_ADMIN";
  const [progress, purchases, savedLoadout] = await Promise.all([
    getDefensePlayerProgress(session.user.id, isAdmin),
    prisma.gamePurchase.findMany({ where: { userId: session.user.id }, select: { itemId: true } }),
    prisma.gameLoadout.findUnique({ where: { userId: session.user.id } }),
  ]);
  const loadout = normalizeDefenseLoadout(savedLoadout);
  const owned = new Set(purchases.map((purchase) => purchase.itemId));
  const changedItem = changedItemId ? getDefenseShopItem(changedItemId) : undefined;
  const message = status === "bought"
    ? isCustomUploadItem(changedItem ?? DEFENSE_SHOP_ITEMS[0])
      ? `${changedItem?.title ?? "Персональный слот"} открыт. Теперь загрузите свой файл.`
      : `${changedItem?.title ?? "Предмет"} куплен и сразу экипирован.`
    : status === "uploaded"
      ? "Личный файл безопасно сохранён и сразу выбран в аккаунте."
    : status === "equipped"
      ? `${changedItem?.title ?? "Предмет"} теперь используется в аккаунте.`
      : status === "owned"
        ? "Этот предмет уже находится в вашей коллекции."
        : error === "credits"
          ? "Недостаточно NOVA Credits. Завершайте миссии и побеждайте командиров."
          : error === "not-owned"
            ? "Сначала купите этот предмет."
            : error === "upload-first"
              ? "Сначала загрузите личный файл, затем его можно экипировать."
              : error === "avatar-format"
                ? "Для аватара нужен JPG, PNG или WebP размером до 4 МБ."
                : error === "music-format"
                  ? "Для личной музыки нужен настоящий MP3-файл размером до 12 МБ."
            : error
              ? "Действие не удалось завершить. Попробуйте ещё раз."
              : null;
  const ownedCount = DEFENSE_SHOP_ITEMS.filter((item) => item.isDefault || owned.has(item.id)).length;
  const normalizedSearch = search.toLocaleLowerCase("ru-RU");
  const visibleItems = DEFENSE_SHOP_ITEMS.filter((item) => {
    if (selectedCategory && item.category !== selectedCategory) return false;
    if (selectedRarity && item.rarity !== selectedRarity) return false;
    if (ownedOnly && !item.isDefault && !owned.has(item.id)) return false;
    if (selectedCollection && !selectedCollection.itemIds.some((itemId) => itemId === item.id)) return false;
    if (!normalizedSearch) return true;
    return `${item.title} ${item.subtitle} ${item.description}`.toLocaleLowerCase("ru-RU").includes(normalizedSearch);
  });
  const hasFilters = Boolean(search || selectedCategory || selectedRarity || ownedOnly || selectedCollection);

  return <div className="min-h-screen"><Header user={session.user} /><main className="page-shell !max-w-[86rem]">
    <section className="relative overflow-hidden rounded-[2rem] border border-nova-accent/15 bg-[#0a1012] shadow-[0_35px_100px_rgba(0,0,0,0.42)]">
      <div className="absolute inset-0 bg-[url('/games/nova-defense-cyber-city.webp')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#070b0d] via-[#070b0d]/92 to-[#070b0d]/42" />
      <div className="relative grid gap-8 px-7 py-12 sm:px-11 lg:grid-cols-[1fr_22rem] lg:items-end lg:py-16">
        <div>
          <Link href="/games" className="inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white"><ArrowLeft size={14} /> Игровой центр</Link>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-nova-accent/20 bg-nova-accent/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-nova-accent"><ShoppingBag size={12} /> NOVA Store · {DEFENSE_SHOP_ITEMS.length} предметов</div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Создайте свой<br /><span className="text-nova-accent">стиль NOVA</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/52">Музыка, аватары, баннеры, титулы и игровая экипировка. Каждая покупка навсегда остаётся в аккаунте и меняется в один клик.</p>
        </div>
        <div className="rounded-2xl border border-nova-accent/20 bg-black/40 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">Ваш баланс</span><Coins size={19} className="text-nova-accent" /></div>
          <div className="mt-4 text-4xl font-semibold text-nova-accent">{progress.credits.toLocaleString("ru-RU")}</div>
          <div className="mt-1 text-xs font-semibold">NOVA Credits</div>
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4 text-[10px]"><span className="text-white/35">Коллекция</span><span className="font-semibold text-cyan-100">{ownedCount} / {DEFENSE_SHOP_ITEMS.length}</span></div>
          <div className="mt-2 text-[10px] leading-5 text-white/35">{isAdmin ? "Администратор получает двойные кредиты за каждую сохранённую миссию." : "Кредиты начисляются за подтверждённые рейтинговые миссии."}</div>
        </div>
      </div>
    </section>

    {message && <div className={error ? "mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-100" : "mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-5 py-4 text-sm text-emerald-100"}>{message}</div>}

    <section className="mt-8">
      <div className="flex items-end justify-between gap-4"><div><p className="page-eyebrow">Новые миры</p><h2 className="mt-1 text-2xl font-semibold">Тематические коллекции</h2></div><div className="hidden text-xs text-nova-muted sm:block">По 9 связанных предметов в каждом комплекте</div></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {collections.map((collection) => {
          const collectionItems = DEFENSE_SHOP_ITEMS.filter((item) => collection.itemIds.some((itemId) => itemId === item.id));
          const collectionOwned = collectionItems.filter((item) => item.isDefault || owned.has(item.id)).length;
          const collectionPrice = collectionItems.reduce((sum, item) => sum + item.price, 0);
          const active = selectedCollection?.id === collection.id;
          return <Link key={collection.id} href={`/games/shop?collection=${collection.id}#catalog`} className={active ? "group relative min-h-64 overflow-hidden rounded-[1.6rem] border border-nova-accent/45 shadow-[0_0_40px_rgba(227,182,75,0.1)]" : "group relative min-h-64 overflow-hidden rounded-[1.6rem] border border-white/[0.1] transition hover:-translate-y-0.5 hover:border-white/20"}>
            <span className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${collection.image})` }} />
            <span className={`absolute inset-0 bg-gradient-to-t ${collection.accent} to-black/10`} />
            <span className="absolute inset-0 bg-gradient-to-t from-[#050809] via-[#050809]/20 to-transparent" />
            <span className="relative flex h-full min-h-64 flex-col justify-end p-6">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-nova-accent">{collection.subtitle}</span>
              <span className="mt-2 text-2xl font-semibold text-white">{collection.title}</span>
              <span className="mt-2 max-w-sm text-[11px] leading-5 text-white/58">{collection.description}</span>
              <span className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[10px]"><span className="text-white/48">{collectionOwned} / {collectionItems.length} открыто · {collectionPrice.toLocaleString("ru-RU")} Credits</span><span className="inline-flex items-center gap-1 font-semibold text-white">Открыть <ArrowRight size={12} /></span></span>
            </span>
          </Link>;
        })}
      </div>
    </section>

    <section id="catalog" className="mt-8 scroll-mt-24 rounded-[1.6rem] border border-white/[0.08] bg-white/[0.018] p-4 sm:p-5">
      <form action="/games/shop#catalog" method="get" className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_13rem_12rem_auto_auto] lg:items-center">
        <label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} /><input name="q" defaultValue={search} className="nova-input !min-h-11 !pl-10" placeholder="Найти предмет, музыку или фон" /></label>
        <select name="category" defaultValue={selectedCategory ?? ""} className="nova-input !min-h-11">
          <option value="">Все разделы</option>
          {categories.map((category) => <option key={category} value={category}>{DEFENSE_CATEGORY_COPY[category].title}</option>)}
        </select>
        <select name="rarity" defaultValue={selectedRarity ?? ""} className="nova-input !min-h-11">
          <option value="">Любая редкость</option><option value="base">Базовые</option><option value="rare">Редкие</option><option value="epic">Эпические</option><option value="legendary">Легендарные</option>
        </select>
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-black/15 px-4 text-xs text-white/62 transition hover:border-white/15"><input name="owned" value="1" defaultChecked={ownedOnly} type="checkbox" className="accent-[#e3b64b]" /> Только мои</label>
        <button className="nova-button !min-h-11 !rounded-xl" type="submit"><Search size={14} /> Показать</button>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4"><div className="flex flex-wrap gap-2"><Link href="/games/shop#catalog" className={!hasFilters ? "nova-badge" : "rounded-full border border-white/[0.08] px-3 py-1.5 text-[9px] text-white/45 transition hover:text-white"}>Все 66</Link>{categories.map((category) => <Link key={category} href={`/games/shop?category=${category}#catalog`} className={selectedCategory === category ? "nova-badge" : "rounded-full border border-white/[0.08] px-3 py-1.5 text-[9px] text-white/45 transition hover:text-white"}>{DEFENSE_CATEGORY_COPY[category].eyebrow}</Link>)}</div><div className="flex items-center gap-3 text-[10px] text-white/35"><span className="inline-flex items-center gap-1.5"><Layers3 size={12} /> Найдено: {visibleItems.length}</span>{hasFilters && <Link href="/games/shop#catalog" className="inline-flex items-center gap-1 text-nova-accent"><X size={12} /> Сбросить</Link>}</div></div>
    </section>

    <section className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-3 sm:grid-cols-3 lg:grid-cols-5">
      {categories.map((category) => {
        const equipped = DEFENSE_SHOP_ITEMS.find((item) => item.category === category && item.value === loadout[category]);
        return <Link href={`/games/shop?category=${category}#catalog`} key={category} className="rounded-xl border border-white/[0.055] bg-black/15 p-3 transition hover:border-nova-accent/20 hover:bg-nova-accent/[0.035]"><div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.15em] text-white/28"><CategoryIcon category={category} /> {DEFENSE_CATEGORY_COPY[category].eyebrow}</div><div className="mt-2 truncate text-xs font-semibold text-white/78">{equipped?.title}</div></Link>;
      })}
    </section>

    {categories.map((category) => {
      const copy = DEFENSE_CATEGORY_COPY[category];
      const items = visibleItems.filter((item) => item.category === category);
      if (!items.length) return null;
      return <section key={category} className="mt-10 scroll-mt-24" id={category}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="page-eyebrow">{copy.eyebrow}</p><h2 className="mt-1 text-2xl font-semibold">{copy.title}</h2><p className="mt-2 text-xs text-nova-muted">{copy.description}</p></div><div className="text-xs text-nova-muted">{items.filter((item) => item.isDefault || owned.has(item.id)).length} из {items.length} открыто</div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => <StoreCard
            key={item.id}
            item={item}
            owned={Boolean(item.isDefault || owned.has(item.id))}
            equipped={loadout[category] === item.value}
            affordable={progress.credits >= item.price}
            balance={progress.credits}
            customUrl={item.id === "avatar-custom" ? savedLoadout?.customAvatarUrl : item.id === "music-custom" ? savedLoadout?.customMusicUrl : null}
          />)}
        </div>
      </section>;
    })}

    {visibleItems.length === 0 && <section className="mt-10 rounded-[1.6rem] border border-dashed border-white/[0.12] bg-white/[0.018] px-6 py-16 text-center"><Search className="mx-auto text-white/20" size={32} /><h2 className="mt-5 text-xl font-semibold">Ничего не найдено</h2><p className="mt-2 text-sm text-nova-muted">Попробуйте изменить запрос или убрать часть фильтров.</p><Link href="/games/shop#catalog" className="nova-button-secondary mt-6 !rounded-xl"><X size={14} /> Сбросить фильтры</Link></section>}

    <section className="mt-10 grid gap-4 lg:grid-cols-3">
      <InfoCard icon={<Zap size={19} />} title={isAdmin ? "Награда ×2" : "Честная награда"} text={isAdmin ? "Личные миссии администратора дают вдвое больше кредитов и не входят в рейтинг учеников." : "Кредиты даются только за полноценную миссию: от 45 секунд, 10 целей и 80% точности."} />
      <InfoCard icon={<LockKeyhole size={19} />} title="Покупка навсегда" text="Музыка, оформление профиля и игровая экипировка сохраняются в аккаунте на всех устройствах." />
      <InfoCard icon={<Star size={19} />} title="Честный рейтинг" text="Все предметы косметические: они меняют стиль, но не скорость целей и не количество очков." />
    </section>

    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/games/defense" className="nova-button !min-h-12 !rounded-xl"><Gamepad2 size={17} /> Испытать игру</Link><Link href="/profile" className="nova-button-secondary !min-h-12 !rounded-xl">Открыть мой профиль</Link></div>
  </main></div>;
}

function StoreCard({ item, owned, equipped, affordable, balance, customUrl }: { item: DefenseShopItem; owned: boolean; equipped: boolean; affordable: boolean; balance: number; customUrl?: string | null }) {
  const custom = isCustomUploadItem(item);
  const customKind = item.id === "music-custom" ? "music" : "avatar";
  return <article className={equipped ? "group relative overflow-hidden rounded-[1.6rem] border border-nova-accent/30 bg-[#0c1214] shadow-[0_0_35px_rgba(227,182,75,0.06)]" : owned ? "group relative overflow-hidden rounded-[1.6rem] border border-emerald-400/16 bg-[#0c1214]" : "group relative overflow-hidden rounded-[1.6rem] border border-white/[0.09] bg-[#0c1214]"}>
    <div className="relative h-44 overflow-hidden">
      {customKind === "avatar" && customUrl ? <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${customUrl})` }} /> : item.image ? <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${item.image})` }} /> : <div className="absolute inset-0 transition duration-500 group-hover:scale-105" style={{ background: item.preview }} />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c1214] via-transparent to-black/10" />
      <div className="absolute left-3 top-3"><Rarity rarity={item.rarity} /></div>
      <div className="absolute right-3 top-3">{equipped ? <span className="inline-flex items-center gap-1 rounded-full border border-nova-accent/25 bg-[#151105]/80 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-nova-accent backdrop-blur"><Check size={9} /> Экипировано</span> : owned ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-[#07100d]/80 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur"><Check size={9} /> Открыто</span> : <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/55 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-white/68 backdrop-blur"><LockKeyhole size={9} /> Закрыто</span>}</div>
      {!item.image && !(customKind === "avatar" && customUrl) && <div className="absolute inset-0 grid place-items-center"><PreviewGlyph category={item.category} /></div>}
    </div>
    <div className="p-5"><div className="flex min-h-12 items-start justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-[9px] uppercase tracking-[0.13em] text-nova-accent">{item.subtitle}</p></div>{item.price > 0 && <div className="flex items-center gap-1 rounded-lg border border-nova-accent/15 bg-nova-accent/[0.055] px-2.5 py-1.5 text-xs font-semibold text-nova-accent"><Coins size={12} /> {item.price}</div>}</div><p className="mt-3 min-h-16 text-[11px] leading-5 text-nova-muted">{item.description}</p>
      {item.audio && <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/25 p-2.5"><audio className="h-8 w-full" controls preload="none"><source src={item.audio.src} type="audio/mpeg" /></audio><p className="mt-2 text-[8px] leading-4 text-white/35"><a className="transition hover:text-nova-accent" href={item.audio.sourceUrl} target="_blank" rel="noreferrer">{item.audio.credit}</a> · <a className="transition hover:text-nova-accent" href={item.audio.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a></p></div>}
      {custom && owned ? <div className="mt-4 space-y-2">
        {customKind === "music" && customUrl && <audio className="h-8 w-full" controls preload="none"><source src={customUrl} type="audio/mpeg" /></audio>}
        <ShopMediaUpload kind={customKind} customUrl={customUrl} />
        {customUrl && (equipped ? <div className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-nova-accent/18 bg-nova-accent/[0.055] text-xs font-semibold text-nova-accent"><Check size={14} /> Используется</div> : <ShopItemAction itemId={item.id} kind="equip" />)}
      </div> : equipped ? <div className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-nova-accent/18 bg-nova-accent/[0.055] text-xs font-semibold text-nova-accent"><Check size={14} /> Используется</div> : owned ? <ShopItemAction className="mt-4" itemId={item.id} kind="equip" /> : <div className="mt-4"><ShopItemAction itemId={item.id} kind="purchase" price={item.price} />{!affordable && <p className="mt-2 text-center text-[8px] text-white/28">Не хватает {(item.price - balance).toLocaleString("ru-RU")} кредитов</p>}</div>}
    </div>
  </article>;
}

function CategoryIcon({ category }: { category: DefenseShopCategory }) {
  if (category === "laser") return <Zap size={11} />;
  if (category === "core") return <Orbit size={11} />;
  if (category === "burst") return <Sparkles size={11} />;
  if (category === "music") return <Music2 size={11} />;
  if (category === "avatar") return <CircleUserRound size={11} />;
  if (category === "frame") return <Frame size={11} />;
  if (category === "banner") return <ImageIcon size={11} />;
  if (category === "profileTitle") return <Badge size={11} />;
  return <Gem size={11} />;
}

function PreviewGlyph({ category }: { category: DefenseShopCategory }) {
  if (category === "laser") return <div className="h-px w-28 rotate-[-18deg] bg-white shadow-[0_0_14px_4px_currentColor]" />;
  if (category === "core") return <div className="h-16 w-16 rounded-full border border-white/35 shadow-[0_0_30px_8px_rgba(255,255,255,0.2),inset_0_0_22px_rgba(255,255,255,0.2)]" />;
  if (category === "music") return <Music2 size={42} className="text-white/70 drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]" />;
  if (category === "avatar") return <CircleUserRound size={48} className="text-white/65" />;
  if (category === "frame") return <Frame size={52} className="text-white/70 drop-shadow-[0_0_18px_rgba(251,191,36,0.45)]" />;
  if (category === "banner") return <ImageIcon size={50} className="text-white/65" />;
  if (category === "profileTitle") return <Badge size={50} className="text-white/70 drop-shadow-[0_0_18px_rgba(251,191,36,0.45)]" />;
  return <Sparkles size={42} className="text-white/65 drop-shadow-[0_0_18px_rgba(255,255,255,0.65)]" />;
}

function Rarity({ rarity }: { rarity: DefenseShopItem["rarity"] }) {
  const copy = rarity === "legendary" ? "Легендарный" : rarity === "epic" ? "Эпический" : rarity === "rare" ? "Редкий" : "Базовый";
  return <span className={rarity === "legendary" ? "rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur" : rarity === "epic" ? "rounded-full border border-fuchsia-300/20 bg-fuchsia-300/[0.08] px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-fuchsia-200 backdrop-blur" : rarity === "rare" ? "rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-cyan-200 backdrop-blur" : "rounded-full border border-white/12 bg-black/40 px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-white/55 backdrop-blur"}>{copy}</span>;
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="data-card p-5"><span className="grid h-10 w-10 place-items-center rounded-xl border border-nova-accent/18 bg-nova-accent/[0.07] text-nova-accent">{icon}</span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-nova-muted">{text}</p></div>;
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
