import { IsString, Matches } from 'class-validator';

const MISSION_CODE = /^[A-Z][A-Z_]{2,39}$/;

export class AcceptMissionDto {
  @IsString()
  @Matches(MISSION_CODE)
  missionCode: string;
}
