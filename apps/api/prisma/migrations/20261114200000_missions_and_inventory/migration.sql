-- Missões persistentes e inventário. `CharacterMission` já existia sem uso;
-- aqui ela passa a guardar o estado de cada missão por personagem.
ALTER TABLE "Character" ADD COLUMN "energyUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "CharacterItem" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "itemCode" VARCHAR(40) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CharacterItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterItem_characterId_itemCode_key" ON "CharacterItem"("characterId", "itemCode");
CREATE INDEX "CharacterItem_characterId_idx" ON "CharacterItem"("characterId");

ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
