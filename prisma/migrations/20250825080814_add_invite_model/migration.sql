-- CreateTable
CREATE TABLE "public"."Invite" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProgressEntry" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB,
    "summary" TEXT NOT NULL,
    "blockers" TEXT,
    "nextActions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "public"."Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_deckId_idx" ON "public"."Invite"("deckId");

-- CreateIndex
CREATE INDEX "Invite_token_idx" ON "public"."Invite"("token");

-- CreateIndex
CREATE INDEX "ProgressEntry_deckId_weekStart_idx" ON "public"."ProgressEntry"("deckId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressEntry_deckId_weekStart_key" ON "public"."ProgressEntry"("deckId", "weekStart");

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "public"."Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressEntry" ADD CONSTRAINT "ProgressEntry_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "public"."Deck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressEntry" ADD CONSTRAINT "ProgressEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
