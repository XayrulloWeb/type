CREATE TABLE "Olympiad" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "text" TEXT NOT NULL,
  "textSecond" TEXT,
  "language" TEXT NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "attemptLimit" INTEGER NOT NULL DEFAULT 2,
  "breakSeconds" INTEGER NOT NULL DEFAULT 10,
  "status" TEXT NOT NULL DEFAULT 'WAITING',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "Olympiad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OlympiadClass" (
  "olympiadId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  CONSTRAINT "OlympiadClass_pkey" PRIMARY KEY ("olympiadId", "classId")
);

CREATE TABLE "OlympiadParticipant" (
  "id" TEXT NOT NULL,
  "olympiadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "duration" INTEGER,
  "wpm" INTEGER,
  "rawWpm" INTEGER,
  "accuracy" DOUBLE PRECISION,
  "correctChars" INTEGER,
  "incorrectChars" INTEGER,
  "extraChars" INTEGER,
  "missedChars" INTEGER,
  "focusLostCount" INTEGER NOT NULL DEFAULT 0,
  "pasteDetected" BOOLEAN NOT NULL DEFAULT false,
  "needsReview" BOOLEAN NOT NULL DEFAULT false,
  "disqualifiedAt" TIMESTAMP(3),
  "disqualifiedBy" TEXT,
  "disqualificationReason" TEXT,
  CONSTRAINT "OlympiadParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OlympiadAttempt" (
  "id" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "duration" INTEGER NOT NULL,
  "wpm" INTEGER NOT NULL,
  "rawWpm" INTEGER NOT NULL,
  "accuracy" DOUBLE PRECISION NOT NULL,
  "correctChars" INTEGER NOT NULL,
  "incorrectChars" INTEGER NOT NULL,
  "extraChars" INTEGER NOT NULL,
  "missedChars" INTEGER NOT NULL,
  "focusLostCount" INTEGER NOT NULL DEFAULT 0,
  "pasteDetected" BOOLEAN NOT NULL DEFAULT false,
  "needsReview" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "OlympiadAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Olympiad_status_createdAt_idx" ON "Olympiad"("status", "createdAt");
CREATE INDEX "OlympiadClass_classId_idx" ON "OlympiadClass"("classId");
CREATE INDEX "OlympiadParticipant_olympiadId_submittedAt_idx" ON "OlympiadParticipant"("olympiadId", "submittedAt");
CREATE INDEX "OlympiadParticipant_userId_idx" ON "OlympiadParticipant"("userId");
CREATE UNIQUE INDEX "OlympiadParticipant_olympiadId_userId_key" ON "OlympiadParticipant"("olympiadId", "userId");
CREATE INDEX "OlympiadAttempt_participantId_idx" ON "OlympiadAttempt"("participantId");
CREATE UNIQUE INDEX "OlympiadAttempt_participantId_attemptNumber_key" ON "OlympiadAttempt"("participantId", "attemptNumber");

ALTER TABLE "OlympiadClass" ADD CONSTRAINT "OlympiadClass_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadClass" ADD CONSTRAINT "OlympiadClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadParticipant" ADD CONSTRAINT "OlympiadParticipant_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadParticipant" ADD CONSTRAINT "OlympiadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OlympiadAttempt" ADD CONSTRAINT "OlympiadAttempt_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "OlympiadParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
