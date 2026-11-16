ALTER TABLE "GameLoadout"
  ADD COLUMN "music" TEXT NOT NULL DEFAULT 'adaptive',
  ADD COLUMN "avatar" TEXT NOT NULL DEFAULT 'initials',
  ADD COLUMN "frame" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "banner" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "profileTitle" TEXT NOT NULL DEFAULT 'rookie';
