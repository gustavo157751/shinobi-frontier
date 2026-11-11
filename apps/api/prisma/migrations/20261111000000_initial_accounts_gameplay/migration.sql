-- Initial database schema. Prisma-generated IDs are supplied by the application.
CREATE TYPE "ShinobiPath" AS ENUM ('SHADOW_BLADE', 'FLAME_EYE', 'WIND_DANCER', 'WATER_CLAW', 'STONE_FIST');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "energy" INTEGER NOT NULL DEFAULT 100,
    "path" "ShinobiPath" NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "premium" INTEGER NOT NULL DEFAULT 0,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "vitality" INTEGER NOT NULL DEFAULT 10,
    "agility" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ninja" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "Ninja_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CharacterNinja" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "ninjaId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "stars" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER,
    CONSTRAINT "CharacterNinja_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CharacterMission" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "missionCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CharacterMission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CombatBattle" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CombatBattle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");
CREATE INDEX "AccountAuditEvent_userId_createdAt_idx" ON "AccountAuditEvent"("userId", "createdAt");
CREATE INDEX "AccountAuditEvent_event_createdAt_idx" ON "AccountAuditEvent"("event", "createdAt");
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");
CREATE INDEX "Character_userId_idx" ON "Character"("userId");
CREATE UNIQUE INDEX "Ninja_code_key" ON "Ninja"("code");
CREATE UNIQUE INDEX "CharacterNinja_characterId_ninjaId_key" ON "CharacterNinja"("characterId", "ninjaId");
CREATE UNIQUE INDEX "CharacterMission_characterId_missionCode_key" ON "CharacterMission"("characterId", "missionCode");
CREATE INDEX "CombatBattle_characterId_status_idx" ON "CombatBattle"("characterId", "status");

ALTER TABLE "AccountAuditEvent" ADD CONSTRAINT "AccountAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterNinja" ADD CONSTRAINT "CharacterNinja_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterNinja" ADD CONSTRAINT "CharacterNinja_ninjaId_fkey" FOREIGN KEY ("ninjaId") REFERENCES "Ninja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CharacterMission" ADD CONSTRAINT "CharacterMission_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CombatBattle" ADD CONSTRAINT "CombatBattle_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
