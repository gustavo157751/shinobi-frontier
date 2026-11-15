import { IsString, Matches } from 'class-validator';

const TALENT_CODE = /^[A-Z][A-Z_0-9]{2,39}$/;

export class LearnTalentDto {
  @IsString()
  @Matches(TALENT_CODE)
  talentCode: string;
}
