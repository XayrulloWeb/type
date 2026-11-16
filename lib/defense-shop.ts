export type DefenseArenaTheme = "nova" | "cyber" | "ice";
export type DefenseLaserTheme = "cyan" | "solar" | "plasma" | "toxic";
export type DefenseCoreTheme = "nova" | "obsidian" | "royal" | "quantum";
export type DefenseBurstTheme = "spark" | "nova" | "thunder" | "void";
export type DefenseMusicTheme = "adaptive" | "cipher" | "lightless" | "impact";
export type ProfileAvatarTheme = "initials" | "cadet" | "fox";
export type ProfileFrameTheme = "none" | "solar" | "plasma" | "legend";
export type ProfileBannerTheme = "none" | "orbital" | "neon";
export type ProfileTitleTheme = "rookie" | "record" | "storm" | "legend";
export type DefenseShopCategory = "arena" | "laser" | "core" | "burst" | "music" | "avatar" | "frame" | "banner" | "profileTitle";
export type DefenseShopRarity = "base" | "rare" | "epic" | "legendary";

export interface DefenseLoadout {
  arena: DefenseArenaTheme;
  laser: DefenseLaserTheme;
  core: DefenseCoreTheme;
  burst: DefenseBurstTheme;
  music: DefenseMusicTheme;
  avatar: ProfileAvatarTheme;
  frame: ProfileFrameTheme;
  banner: ProfileBannerTheme;
  profileTitle: ProfileTitleTheme;
}

export interface DefenseShopItem {
  id: string;
  category: DefenseShopCategory;
  value: string;
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  preview: string;
  price: number;
  rarity: DefenseShopRarity;
  isDefault?: boolean;
  audio?: {
    src: string;
    credit: string;
    sourceUrl: string;
    licenseUrl: string;
  };
}

export const DEFAULT_DEFENSE_LOADOUT: DefenseLoadout = {
  arena: "nova",
  laser: "cyan",
  core: "nova",
  burst: "spark",
  music: "adaptive",
  avatar: "initials",
  frame: "none",
  banner: "none",
  profileTitle: "rookie",
};

export const DEFENSE_CATEGORY_COPY: Record<DefenseShopCategory, { title: string; eyebrow: string; description: string }> = {
  arena: { title: "Боевые арены", eyebrow: "Мир миссии", description: "Полностью меняют фон, атмосферу и музыку боя." },
  laser: { title: "Лазерные системы", eyebrow: "Цвет выстрела", description: "Меняют луч захвата, свечение и цвет каждого выстрела." },
  core: { title: "Энергетические ядра", eyebrow: "Центр защиты", description: "Новый реактор в центре периметра со своим свечением." },
  burst: { title: "Эффекты уничтожения", eyebrow: "Финальный удар", description: "Особая вспышка каждый раз, когда цель уничтожена." },
  music: { title: "Музыкальная коллекция", eyebrow: "Саундтрек", description: "Настоящие лицензированные композиции. Можно послушать до покупки и включить в игре." },
  avatar: { title: "Аватары профиля", eyebrow: "Ваш персонаж", description: "Коллекционные персонажи NOVA, которые заменяют обычные инициалы в личном профиле." },
  frame: { title: "Рамки профиля", eyebrow: "Редкий контур", description: "Добавляют сияющую рамку и особый эффект вокруг аватара." },
  banner: { title: "Баннеры профиля", eyebrow: "Личный фон", description: "Меняют большую обложку личного профиля и делают аккаунт узнаваемым." },
  profileTitle: { title: "Титулы", eyebrow: "Подпись героя", description: "Редкая подпись под именем, показывающая статус владельца коллекции." },
};

export const DEFENSE_SHOP_ITEMS: readonly DefenseShopItem[] = [
  {
    id: "default-arena-nova",
    category: "arena",
    value: "nova",
    title: "NOVA Prime",
    subtitle: "Золотое ядро",
    description: "Фирменная арена каждого защитника с тёплой музыкой и золотым реактором.",
    image: "/games/nova-defense-arena.webp",
    preview: "linear-gradient(135deg,#17130a,#e3b64b)",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "arena-cyber",
    category: "arena",
    value: "cyber",
    title: "Neon City",
    subtitle: "Ночной мегаполис",
    description: "Неоновая арена с холодным кибер-звучанием и атмосферой ночного города.",
    image: "/games/nova-defense-cyber-city.webp",
    preview: "linear-gradient(135deg,#06171c,#22d3ee)",
    price: 80,
    rarity: "rare",
  },
  {
    id: "arena-ice",
    category: "arena",
    value: "ice",
    title: "Ice Citadel",
    subtitle: "Ледяное сияние",
    description: "Редкая ледяная цитадель с ярким ядром и собственной спокойной музыкой.",
    image: "/games/nova-defense-ice-citadel.webp",
    preview: "linear-gradient(135deg,#08121f,#93c5fd)",
    price: 140,
    rarity: "epic",
  },
  {
    id: "default-laser-cyan",
    category: "laser",
    value: "cyan",
    title: "Photon Line",
    subtitle: "Чистый фотон",
    description: "Стандартный точный луч NOVA голубого спектра.",
    preview: "linear-gradient(135deg,#071012 20%,#8df4ff 50%,#071012 80%)",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "laser-solar",
    category: "laser",
    value: "solar",
    title: "Solar Lance",
    subtitle: "Солнечное копьё",
    description: "Золотой луч с мощным янтарным ореолом вокруг цели.",
    preview: "linear-gradient(135deg,#100b02 20%,#fbbf24 50%,#100b02 80%)",
    price: 55,
    rarity: "rare",
  },
  {
    id: "laser-plasma",
    category: "laser",
    value: "plasma",
    title: "Plasma Rift",
    subtitle: "Разлом плазмы",
    description: "Фиолетовый плазменный след из экспериментальной лаборатории.",
    preview: "linear-gradient(135deg,#12051d 20%,#d946ef 50%,#12051d 80%)",
    price: 75,
    rarity: "epic",
  },
  {
    id: "laser-toxic",
    category: "laser",
    value: "toxic",
    title: "Toxic Pulse",
    subtitle: "Изумрудный импульс",
    description: "Яркий зелёный луч с радиоактивным свечением.",
    preview: "linear-gradient(135deg,#03140a 20%,#4ade80 50%,#03140a 80%)",
    price: 95,
    rarity: "epic",
  },
  {
    id: "default-core-nova",
    category: "core",
    value: "nova",
    title: "NOVA Core",
    subtitle: "Первый реактор",
    description: "Надёжное золотое ядро базовой защитной системы.",
    preview: "radial-gradient(circle,#fff7c2 0 8%,#e3b64b 9% 24%,#122027 25% 43%,#070b0d 44%)",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "core-obsidian",
    category: "core",
    value: "obsidian",
    title: "Obsidian Heart",
    subtitle: "Тёмная материя",
    description: "Чёрное сердце с красным контуром и тяжёлым пульсом.",
    preview: "radial-gradient(circle,#fb7185 0 8%,#19070a 9% 28%,#ef4444 29% 31%,#070b0d 32%)",
    price: 100,
    rarity: "rare",
  },
  {
    id: "core-royal",
    category: "core",
    value: "royal",
    title: "Royal Reactor",
    subtitle: "Императорский заряд",
    description: "Пурпурно-золотой реактор для опытных командиров.",
    preview: "radial-gradient(circle,#fde68a 0 8%,#7e22ce 9% 28%,#e879f9 29% 31%,#09040f 32%)",
    price: 130,
    rarity: "epic",
  },
  {
    id: "core-quantum",
    category: "core",
    value: "quantum",
    title: "Quantum Star",
    subtitle: "Живая звезда",
    description: "Легендарное бело-голубое ядро с квантовым ореолом.",
    preview: "radial-gradient(circle,#ffffff 0 8%,#67e8f9 9% 27%,#2563eb 28% 31%,#030712 32%)",
    price: 220,
    rarity: "legendary",
  },
  {
    id: "default-burst-spark",
    category: "burst",
    value: "spark",
    title: "Clean Impact",
    subtitle: "Чистая вспышка",
    description: "Стандартное кольцо энергии при уничтожении цели.",
    preview: "radial-gradient(circle,transparent 0 20%,#8df4ff 22% 25%,transparent 27%)",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "burst-nova",
    category: "burst",
    value: "nova",
    title: "Nova Bloom",
    subtitle: "Звёздный цветок",
    description: "Золотая сверхновая раскрывается на месте уничтоженной цели.",
    preview: "repeating-conic-gradient(from 0deg,#fbbf24 0 8deg,transparent 8deg 28deg)",
    price: 65,
    rarity: "rare",
  },
  {
    id: "burst-thunder",
    category: "burst",
    value: "thunder",
    title: "Thunder Break",
    subtitle: "Разряд молнии",
    description: "Электрический разлом с несколькими синими импульсами.",
    preview: "repeating-conic-gradient(from 10deg,#60a5fa 0 4deg,transparent 4deg 24deg)",
    price: 90,
    rarity: "epic",
  },
  {
    id: "burst-void",
    category: "burst",
    value: "void",
    title: "Black Hole",
    subtitle: "Схлопывание пустоты",
    description: "Легендарная тёмная воронка поглощает уничтоженную цель.",
    preview: "radial-gradient(circle,#020205 0 18%,#a855f7 20% 23%,#312e81 27% 34%,transparent 45%)",
    price: 150,
    rarity: "legendary",
  },
  {
    id: "default-music-adaptive",
    category: "music",
    value: "adaptive",
    title: "Adaptive Pulse",
    subtitle: "Живой синтезатор",
    description: "Базовая музыка NOVA меняется вместе с выбранной ареной и создаётся прямо во время миссии.",
    preview: "radial-gradient(circle at 50% 50%,#e3b64b 0 4%,transparent 5%),repeating-radial-gradient(circle at 50% 50%,#e3b64b22 0 2px,transparent 3px 14px),#070b0d",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "music-cipher",
    category: "music",
    value: "cipher",
    title: "Cipher",
    subtitle: "Яркий электронный ритм",
    description: "Быстрый электронный трек для серии точных ударов и рекордных комбо.",
    preview: "linear-gradient(135deg,#06131d,#06b6d4 48%,#7c3aed)",
    price: 90,
    rarity: "rare",
    audio: {
      src: "/audio/nova/cipher.mp3",
      credit: "Cipher — Kevin MacLeod",
      sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100844",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    id: "music-impact-prelude",
    category: "music",
    value: "impact",
    title: "Impact Prelude",
    subtitle: "Тактический грув",
    description: "Спокойное вступление с ударными и синтезаторами для сосредоточенной игры.",
    preview: "linear-gradient(135deg,#111827,#f59e0b 52%,#451a03)",
    price: 120,
    rarity: "epic",
    audio: {
      src: "/audio/nova/impact-prelude.mp3",
      credit: "Impact Prelude — Kevin MacLeod",
      sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100617",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    id: "music-lightless-dawn",
    category: "music",
    value: "lightless",
    title: "Lightless Dawn",
    subtitle: "Тёмная орбита",
    description: "Атмосферный кинематографичный трек для самых напряжённых волн защиты.",
    preview: "linear-gradient(135deg,#020617,#312e81 46%,#7e22ce)",
    price: 160,
    rarity: "legendary",
    audio: {
      src: "/audio/nova/lightless-dawn.mp3",
      credit: "Lightless Dawn — Kevin MacLeod",
      sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100655",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    id: "default-avatar-initials",
    category: "avatar",
    value: "initials",
    title: "Инициалы NOVA",
    subtitle: "Классический профиль",
    description: "Аккуратный базовый аватар с вашими инициалами.",
    preview: "linear-gradient(135deg,#22282b,#0c0f10)",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "avatar-cosmic-cadet",
    category: "avatar",
    value: "cadet",
    title: "Космический кадет",
    subtitle: "Исследователь NOVA",
    description: "Оригинальный аватар юного исследователя с золотым свечением шлема.",
    image: "/profile-shop/avatar-cosmic-cadet.webp",
    preview: "linear-gradient(135deg,#071521,#e3b64b)",
    price: 85,
    rarity: "rare",
  },
  {
    id: "avatar-cyber-fox",
    category: "avatar",
    value: "fox",
    title: "Кибер-лис",
    subtitle: "Страж неонового города",
    description: "Коллекционный неоновый хранитель для тех, кто печатает быстро и точно.",
    image: "/profile-shop/avatar-cyber-fox.webp",
    preview: "linear-gradient(135deg,#111827,#06b6d4,#a855f7)",
    price: 135,
    rarity: "epic",
  },
  {
    id: "default-frame-none",
    category: "frame",
    value: "none",
    title: "Чистый профиль",
    subtitle: "Без рамки",
    description: "Минималистичное оформление без дополнительного свечения.",
    preview: "linear-gradient(135deg,#252a2d,#0b0e0f)",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "frame-solar",
    category: "frame",
    value: "solar",
    title: "Solar Ring",
    subtitle: "Золотая орбита",
    description: "Двойное золотое кольцо и мягкое солнечное сияние вокруг аватара.",
    preview: "radial-gradient(circle,transparent 0 34%,#fbbf24 36% 40%,transparent 42% 48%,#fde68a 50% 53%,#120d03 55%)",
    price: 60,
    rarity: "rare",
  },
  {
    id: "frame-plasma",
    category: "frame",
    value: "plasma",
    title: "Plasma Halo",
    subtitle: "Фиолетовый разряд",
    description: "Яркий плазменный контур с голубыми искрами.",
    preview: "radial-gradient(circle,transparent 0 34%,#22d3ee 36% 39%,#d946ef 41% 45%,transparent 47%,#11051a 58%)",
    price: 95,
    rarity: "epic",
  },
  {
    id: "frame-legend",
    category: "frame",
    value: "legend",
    title: "Crown of NOVA",
    subtitle: "Рамка легенды",
    description: "Легендарное сочетание золота, белого света и звёздного ореола.",
    preview: "radial-gradient(circle,transparent 0 32%,#fff 34% 36%,#fbbf24 38% 42%,#60a5fa 44% 47%,transparent 50%),#05070b",
    price: 170,
    rarity: "legendary",
  },
  {
    id: "default-banner-none",
    category: "banner",
    value: "none",
    title: "NOVA Dark",
    subtitle: "Базовая обложка",
    description: "Чистый тёмный фон с фирменным золотым акцентом.",
    preview: "linear-gradient(120deg,#080a0b,#171b1d 62%,#4b3710)",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "banner-orbital",
    category: "banner",
    value: "orbital",
    title: "Orbital Observatory",
    subtitle: "Вид на новую планету",
    description: "Панорамная космическая обложка с планетой, обсерваторией и потоками энергии.",
    image: "/profile-shop/banner-orbital-observatory.webp",
    preview: "linear-gradient(120deg,#061323,#2563eb,#e3b64b)",
    price: 125,
    rarity: "epic",
  },
  {
    id: "banner-neon-city",
    category: "banner",
    value: "neon",
    title: "Neon Skyline",
    subtitle: "Город после полуночи",
    description: "Неоновый мегаполис из мира Typing Defense теперь становится обложкой профиля.",
    image: "/games/nova-defense-cyber-city.webp",
    preview: "linear-gradient(120deg,#020617,#0891b2,#c026d3)",
    price: 150,
    rarity: "legendary",
  },
  {
    id: "default-title-rookie",
    category: "profileTitle",
    value: "rookie",
    title: "Защитник NOVA",
    subtitle: "Первый титул",
    description: "Базовое звание каждого участника тренировочного корпуса.",
    preview: "linear-gradient(135deg,#15191b,#e3b64b33)",
    price: 0,
    rarity: "base",
    isDefault: true,
  },
  {
    id: "title-record-hunter",
    category: "profileTitle",
    value: "record",
    title: "Охотник за рекордами",
    subtitle: "Редкий титул",
    description: "Для тех, кто всегда возвращается за новым личным рекордом.",
    preview: "linear-gradient(135deg,#05131a,#0891b2)",
    price: 50,
    rarity: "rare",
  },
  {
    id: "title-keyboard-storm",
    category: "profileTitle",
    value: "storm",
    title: "Гроза клавиатуры",
    subtitle: "Эпический титул",
    description: "Заметная подпись для мастера быстрых и точных серий.",
    preview: "linear-gradient(135deg,#1e1b4b,#7c3aed,#22d3ee)",
    price: 90,
    rarity: "epic",
  },
  {
    id: "title-nova-legend",
    category: "profileTitle",
    value: "legend",
    title: "Легенда NOVA",
    subtitle: "Высший титул",
    description: "Самое редкое звание коллекции — золотая подпись владельца большого арсенала.",
    preview: "linear-gradient(135deg,#2a1802,#fbbf24,#fff7c2)",
    price: 190,
    rarity: "legendary",
  },
] as const;

export function getDefenseShopItem(itemId: string) {
  return DEFENSE_SHOP_ITEMS.find((item) => item.id === itemId);
}

export function getDefenseShopItemForArena(arena: DefenseArenaTheme) {
  return DEFENSE_SHOP_ITEMS.find((item) => item.category === "arena" && item.value === arena);
}

export function getDefenseShopItemForCategory(category: DefenseShopCategory, value: string) {
  return DEFENSE_SHOP_ITEMS.find((item) => item.category === category && item.value === value);
}

export function defenseOwnedArenas(itemIds: readonly string[]): DefenseArenaTheme[] {
  const owned = new Set<DefenseArenaTheme>(["nova"]);
  for (const itemId of itemIds) {
    const item = getDefenseShopItem(itemId);
    if (item?.category === "arena") owned.add(item.value as DefenseArenaTheme);
  }
  return Array.from(owned);
}

export function normalizeDefenseLoadout(loadout: Partial<Record<keyof DefenseLoadout, string>> | null | undefined): DefenseLoadout {
  return {
    arena: isCatalogValue("arena", loadout?.arena) ? loadout.arena as DefenseArenaTheme : DEFAULT_DEFENSE_LOADOUT.arena,
    laser: isCatalogValue("laser", loadout?.laser) ? loadout.laser as DefenseLaserTheme : DEFAULT_DEFENSE_LOADOUT.laser,
    core: isCatalogValue("core", loadout?.core) ? loadout.core as DefenseCoreTheme : DEFAULT_DEFENSE_LOADOUT.core,
    burst: isCatalogValue("burst", loadout?.burst) ? loadout.burst as DefenseBurstTheme : DEFAULT_DEFENSE_LOADOUT.burst,
    music: isCatalogValue("music", loadout?.music) ? loadout.music as DefenseMusicTheme : DEFAULT_DEFENSE_LOADOUT.music,
    avatar: isCatalogValue("avatar", loadout?.avatar) ? loadout.avatar as ProfileAvatarTheme : DEFAULT_DEFENSE_LOADOUT.avatar,
    frame: isCatalogValue("frame", loadout?.frame) ? loadout.frame as ProfileFrameTheme : DEFAULT_DEFENSE_LOADOUT.frame,
    banner: isCatalogValue("banner", loadout?.banner) ? loadout.banner as ProfileBannerTheme : DEFAULT_DEFENSE_LOADOUT.banner,
    profileTitle: isCatalogValue("profileTitle", loadout?.profileTitle) ? loadout.profileTitle as ProfileTitleTheme : DEFAULT_DEFENSE_LOADOUT.profileTitle,
  };
}

export function loadoutUpdateForItem(item: DefenseShopItem) {
  return { [item.category]: item.value } as Partial<Record<keyof DefenseLoadout, string>>;
}

function isCatalogValue(category: DefenseShopCategory, value: string | undefined): value is string {
  return Boolean(value && DEFENSE_SHOP_ITEMS.some((item) => item.category === category && item.value === value));
}
