export type DefenseArenaTheme = "nova" | "cyber" | "ice";
export type DefenseShopItemId = "arena-cyber" | "arena-ice";

export interface DefenseShopItem {
  id: DefenseShopItemId;
  arena: Exclude<DefenseArenaTheme, "nova">;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  price: number;
  accent: string;
}

export const DEFENSE_SHOP_ITEMS: readonly DefenseShopItem[] = [
  {
    id: "arena-cyber",
    arena: "cyber",
    title: "Neon City",
    subtitle: "Ночной мегаполис",
    description: "Неоновая арена с холодным кибер-звучанием и атмосферой ночного города.",
    image: "/games/nova-defense-cyber-city.webp",
    price: 80,
    accent: "cyan",
  },
  {
    id: "arena-ice",
    arena: "ice",
    title: "Ice Citadel",
    subtitle: "Ледяное сияние",
    description: "Редкая ледяная цитадель с ярким ядром и собственной спокойной музыкой.",
    image: "/games/nova-defense-ice-citadel.webp",
    price: 140,
    accent: "ice",
  },
] as const;

export function getDefenseShopItem(itemId: string) {
  return DEFENSE_SHOP_ITEMS.find((item) => item.id === itemId);
}

export function getDefenseShopItemForArena(arena: DefenseArenaTheme) {
  return DEFENSE_SHOP_ITEMS.find((item) => item.arena === arena);
}

export function defenseOwnedArenas(itemIds: readonly string[]): DefenseArenaTheme[] {
  const owned = new Set<DefenseArenaTheme>(["nova"]);
  for (const itemId of itemIds) {
    const item = getDefenseShopItem(itemId);
    if (item) owned.add(item.arena);
  }
  return Array.from(owned);
}
