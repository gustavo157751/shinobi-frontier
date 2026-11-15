-- Árvore de talentos: cada personagem aprende talentos por código.
CREATE TABLE "CharacterTalent" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "talentCode" VARCHAR(40) NOT NULL,
    "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterTalent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterTalent_characterId_talentCode_key" ON "CharacterTalent"("characterId", "talentCode");
CREATE INDEX "CharacterTalent_characterId_idx" ON "CharacterTalent"("characterId");

ALTER TABLE "CharacterTalent" ADD CONSTRAINT "CharacterTalent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
