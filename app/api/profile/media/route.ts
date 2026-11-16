import { existsSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_DEFENSE_LOADOUT } from "@/lib/defense-shop";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const MAX_MUSIC_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return redirectToShop(request, "error", "login");

  try {
    const data = await request.formData();
    const kind = data.get("kind");
    const file = data.get("file");
    if ((kind !== "avatar" && kind !== "music") || !(file instanceof File) || file.size < 1) {
      return redirectToShop(request, "error", "media-invalid", kind === "music" ? "music" : "avatar");
    }

    const itemId = kind === "avatar" ? "avatar-custom" : "music-custom";
    const [user, purchase] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, isActive: true, archivedAt: true } }),
      prisma.gamePurchase.findUnique({ where: { userId_itemId: { userId: session.user.id, itemId } }, select: { id: true } }),
    ]);
    if (!user?.isActive || user.archivedAt || !["STUDENT", "SUPER_ADMIN"].includes(user.role) || !purchase) {
      return redirectToShop(request, "error", "not-owned", kind);
    }

    const root = existsSync("/var/www/nova-type/shared")
      ? "/var/www/nova-type/shared/uploads"
      : path.join(process.cwd(), "public", "uploads");
    const directory = path.join(root, "profiles", user.id);
    await mkdir(directory, { recursive: true });

    if (kind === "avatar") {
      if (file.size > MAX_AVATAR_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return redirectToShop(request, "error", "avatar-format", "avatar");
      }
      const temporaryPath = path.join(directory, "avatar-upload.webp");
      const finalPath = path.join(directory, "avatar.webp");
      try {
        await sharp(Buffer.from(await file.arrayBuffer()))
          .rotate()
          .resize(640, 640, { fit: "cover", position: "attention" })
          .webp({ quality: 86 })
          .toFile(temporaryPath);
        await rename(temporaryPath, finalPath);
      } finally {
        await rm(temporaryPath, { force: true }).catch(() => undefined);
      }
      const customAvatarUrl = `/uploads/profiles/${user.id}/avatar.webp?v=${Date.now()}`;
      await prisma.gameLoadout.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...DEFAULT_DEFENSE_LOADOUT, avatar: "custom", customAvatarUrl },
        update: { avatar: "custom", customAvatarUrl },
      });
      return redirectToShop(request, "status", "uploaded", "avatar");
    }

    if (file.size > MAX_MUSIC_BYTES || file.type !== "audio/mpeg") {
      return redirectToShop(request, "error", "music-format", "music");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const hasId3 = bytes.subarray(0, 3).toString("ascii") === "ID3";
    const hasMpegFrame = bytes.length > 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
    if (!hasId3 && !hasMpegFrame) return redirectToShop(request, "error", "music-format", "music");
    const temporaryPath = path.join(directory, "music-upload.mp3");
    const finalPath = path.join(directory, "music.mp3");
    try {
      await writeFile(temporaryPath, bytes);
      await rename(temporaryPath, finalPath);
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }
    const customMusicUrl = `/uploads/profiles/${user.id}/music.mp3?v=${Date.now()}`;
    await prisma.gameLoadout.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...DEFAULT_DEFENSE_LOADOUT, music: "custom", customMusicUrl },
      update: { music: "custom", customMusicUrl },
    });
    return redirectToShop(request, "status", "uploaded", "music");
  } catch (error) {
    console.error("Profile media upload error:", error);
    return redirectToShop(request, "error", "media-failed");
  }
}

function redirectToShop(request: Request, key: "status" | "error", value: string, anchor?: "avatar" | "music") {
  const url = new URL("/games/shop", request.url);
  url.searchParams.set(key, value);
  if (anchor) url.hash = anchor;
  return NextResponse.redirect(url, 303);
}
