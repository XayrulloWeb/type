"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_DEFENSE_LOADOUT, getDefenseShopItem, isCustomUploadItem, loadoutUpdateForItem } from "@/lib/defense-shop";

type PurchaseOutcome = "bought" | "owned" | "credits" | "unavailable";

export async function purchaseDefenseItem(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const itemId = formData.get("itemId");
  const item = typeof itemId === "string" ? getDefenseShopItem(itemId) : undefined;
  if (!item || item.isDefault || item.price <= 0) redirect("/games/shop?error=unavailable");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true, archivedAt: true },
  });
  if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) redirect("/login");

  let outcome: PurchaseOutcome = "unavailable";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      outcome = await prisma.$transaction(async (tx) => {
        const existing = await tx.gamePurchase.findUnique({ where: { userId_itemId: { userId: user.id, itemId: item.id } }, select: { id: true } });
        if (existing) return "owned";

        const resultWhere = {
          userId: user.id,
          game: "defense",
          ...(user.role === "SUPER_ADMIN" ? {} : { isRanked: true }),
        } satisfies Prisma.GameResultWhereInput;
        const [earned, spent] = await Promise.all([
          tx.gameResult.aggregate({ where: resultWhere, _sum: { rewardCredits: true } }),
          tx.gamePurchase.aggregate({ where: { userId: user.id }, _sum: { price: true } }),
        ]);
        const balance = (earned._sum.rewardCredits ?? 0) - (spent._sum.price ?? 0);
        if (balance < item.price) return "credits";

        await tx.gamePurchase.create({ data: { userId: user.id, itemId: item.id, price: item.price } });
        if (!isCustomUploadItem(item)) {
          const loadoutUpdate = loadoutUpdateForItem(item);
          await tx.gameLoadout.upsert({
            where: { userId: user.id },
            create: { userId: user.id, ...DEFAULT_DEFENSE_LOADOUT, ...loadoutUpdate },
            update: loadoutUpdate,
          });
        }
        return "bought";
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        outcome = "owned";
        break;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt === 0) continue;
      console.error("Defense shop purchase error:", error);
      outcome = "unavailable";
      break;
    }
  }

  revalidatePath("/games");
  revalidatePath("/games/shop");
  revalidatePath("/games/defense");
  revalidatePath("/profile");
  if (outcome === "bought") redirect(`/games/shop?status=bought&item=${item.id}`);
  if (outcome === "owned") redirect("/games/shop?status=owned");
  if (outcome === "credits") redirect("/games/shop?error=credits");
  redirect("/games/shop?error=unavailable");
}

export async function equipDefenseItem(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const itemId = formData.get("itemId");
  const item = typeof itemId === "string" ? getDefenseShopItem(itemId) : undefined;
  if (!item) redirect("/games/shop?error=unavailable");

  const [user, purchase] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, isActive: true, archivedAt: true, gameLoadout: { select: { customAvatarUrl: true, customMusicUrl: true } } } }),
    item.isDefault ? Promise.resolve({ id: "default" }) : prisma.gamePurchase.findUnique({ where: { userId_itemId: { userId: session.user.id, itemId: item.id } }, select: { id: true } }),
  ]);
  if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role)) redirect("/login");
  if (!purchase) redirect("/games/shop?error=not-owned");
  if (item.id === "avatar-custom" && !user.gameLoadout?.customAvatarUrl) redirect("/games/shop?error=upload-first#avatar");
  if (item.id === "music-custom" && !user.gameLoadout?.customMusicUrl) redirect("/games/shop?error=upload-first#music");

  const loadoutUpdate = loadoutUpdateForItem(item);
  await prisma.gameLoadout.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...DEFAULT_DEFENSE_LOADOUT, ...loadoutUpdate },
    update: loadoutUpdate,
  });

  revalidatePath("/games/shop");
  revalidatePath("/games/defense");
  revalidatePath("/profile");
  redirect(`/games/shop?status=equipped&item=${item.id}`);
}
