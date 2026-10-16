CREATE TABLE "User" (
  "id" TEXT NOT NULL, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL,
  "username" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "passwordEncrypted" TEXT,
  "role" TEXT NOT NULL, "classId" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3), "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Class" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "grade" INTEGER NOT NULL, "section" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TestResult" (
  "id" TEXT NOT NULL, "clientAttemptId" TEXT, "userId" TEXT NOT NULL, "mode" TEXT NOT NULL,
  "language" TEXT NOT NULL, "duration" INTEGER NOT NULL, "wordsCount" INTEGER, "wpm" INTEGER NOT NULL,
  "rawWpm" INTEGER NOT NULL, "accuracy" DOUBLE PRECISION NOT NULL, "correctChars" INTEGER NOT NULL,
  "incorrectChars" INTEGER NOT NULL, "extraChars" INTEGER NOT NULL, "missedChars" INTEGER NOT NULL,
  "focusLostCount" INTEGER NOT NULL DEFAULT 0, "isRanked" BOOLEAN NOT NULL DEFAULT true,
  "reviewStatus" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Text" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL, "language" TEXT NOT NULL,
  "grade" INTEGER, "difficulty" TEXT NOT NULL, "createdBy" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Text_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Assignment" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "textId" TEXT NOT NULL, "classId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL, "minimumWpm" INTEGER, "minimumAccuracy" DOUBLE PRECISION,
  "deadline" TIMESTAMP(3), "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AssignmentResult" (
  "id" TEXT NOT NULL, "assignmentId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "testResultId" TEXT, "status" TEXT NOT NULL, "completedAt" TIMESTAMP(3),
  CONSTRAINT "AssignmentResult_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdminActivity" (
  "id" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorUsername" TEXT NOT NULL, "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL, "entityId" TEXT, "description" TEXT NOT NULL, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DailyChallenge" (
  "id" TEXT NOT NULL, "textId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL,
  "attemptLimit" INTEGER NOT NULL DEFAULT 3, CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "_TeacherClasses" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
CREATE INDEX "User_classId_idx" ON "User"("classId");
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");
CREATE UNIQUE INDEX "TestResult_clientAttemptId_key" ON "TestResult"("clientAttemptId");
CREATE INDEX "TestResult_userId_isRanked_wpm_idx" ON "TestResult"("userId", "isRanked", "wpm");
CREATE INDEX "TestResult_isRanked_createdAt_idx" ON "TestResult"("isRanked", "createdAt");
CREATE INDEX "TestResult_reviewStatus_idx" ON "TestResult"("reviewStatus");
CREATE INDEX "AssignmentResult_userId_status_idx" ON "AssignmentResult"("userId", "status");
CREATE UNIQUE INDEX "AssignmentResult_assignmentId_userId_key" ON "AssignmentResult"("assignmentId", "userId");
CREATE INDEX "AdminActivity_createdAt_idx" ON "AdminActivity"("createdAt");
CREATE INDEX "AdminActivity_entityType_entityId_idx" ON "AdminActivity"("entityType", "entityId");
CREATE UNIQUE INDEX "DailyChallenge_date_key" ON "DailyChallenge"("date");
CREATE UNIQUE INDEX "_TeacherClasses_AB_unique" ON "_TeacherClasses"("A", "B");
CREATE INDEX "_TeacherClasses_B_index" ON "_TeacherClasses"("B");

ALTER TABLE "User" ADD CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_textId_fkey" FOREIGN KEY ("textId") REFERENCES "Text"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentResult" ADD CONSTRAINT "AssignmentResult_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentResult" ADD CONSTRAINT "AssignmentResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentResult" ADD CONSTRAINT "AssignmentResult_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_TeacherClasses" ADD CONSTRAINT "_TeacherClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TeacherClasses" ADD CONSTRAINT "_TeacherClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
