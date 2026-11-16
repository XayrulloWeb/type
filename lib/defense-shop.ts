export type DefenseArenaTheme = "nova" | "cyber" | "ice";
export type DefenseLaserTheme = "cyan" | "solar" | "plasma" | "toxic";
export type DefenseCoreTheme = "nova" | "obsidian" | "royal" | "quantum";
export type DefenseBurstTheme = "spark" | "nova" | "thunder" | "void";
export type DefenseShopCategory = "arena" | "laser" | "core" | "burst";
export type DefenseShopRarity = "base" | "rare" | "epic" | "legendary";

export interface DefenseLoadout {
  arena: DefenseArenaTheme;
  laser: DefenseLaserTheme;
  core: DefenseCoreTheme;
  burst: DefenseBurstTheme;
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
}

export const DEFAULT_DEFENSE_LOADOUT: DefenseLoadout = {
  arena: "nova",
  laser: "cyan",
  core: "nova",
  burst: "spark",
};

export const DEFENSE_CATEGORY_COPY: Record<DefenseShopCategory, { title: string; eyebrow: string; description: string }> = {
  arena: { title: "Боевые арены", eyebrow: "Мир миссии", description: "Полностью меняют фон, атмосферу и музыку боя." },
  laser: { title: "Лазерные системы", eyebrow: "Цвет выстрела", description: "Меняют луч захвата, свечение и цвет каждого выстрела." },
  core: { title: "Энергетические ядра", eyebrow: "Центр защиты", description: "Новый реактор в центре периметра со своим свечением." },
  burst: { title: "Эффекты уничтожения", eyebrow: "Финальный удар", description: "Особая вспышка каждый раз, когда цель уничтожена." },
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
] as const;

export function getDefenseShopItem(itemId: string) {
  return DEFENSE_SHOP_ITEMS.find((item) => item.id === itemId);
}

export function getDefenseShopItemForArena(arena: DefenseArenaTheme) {
  return DEFENSE_SHOP_ITEMS.find((item) => item.category === "arena" && item.value === arena);
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
  };
}

export function loadoutUpdateForItem(item: DefenseShopItem) {
  return { [item.category]: item.value } as Partial<Record<keyof DefenseLoadout, string>>;
}

function isCatalogValue(category: DefenseShopCategory, value: string | undefined): value is string {
  return Boolean(value && DEFENSE_SHOP_ITEMS.some((item) => item.category === category && item.value === value));
}
