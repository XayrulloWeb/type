import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDefenseShopItemForCategory, normalizeDefenseLoadout } from "@/lib/defense-shop";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const savedLoadout = await prisma.gameLoadout.findUnique({ where: { userId: session.user.id } });
  const loadout = normalizeDefenseLoadout(savedLoadout);
  const avatar = getDefenseShopItemForCategory("avatar", loadout.avatar);
  const profileTitle = getDefenseShopItemForCategory("profileTitle", loadout.profileTitle);
  const avatarUrl = loadout.avatar === "custom" ? savedLoadout?.customAvatarUrl ?? null : avatar?.image ?? null;

  return NextResponse.json({
    avatarUrl,
    frame: loadout.frame,
    profileTitle: profileTitle?.title ?? null,
  });
}
