import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_FORMATION_SIZE } from './ninja-catalogue';

const NINJA_CODE = /^[A-Z][A-Z_]{2,39}$/;

export class RecruitDto {
  @IsString()
  @Matches(NINJA_CODE)
  ninjaCode: string;
}

export class FormationSlotDto {
  @IsString()
  @Matches(NINJA_CODE)
  ninjaCode: string;

  @IsInt()
  @Min(1)
  @Max(MAX_FORMATION_SIZE)
  position: number;
}

export class FormationDto {
  @IsArray()
  @ArrayMaxSize(MAX_FORMATION_SIZE)
  @ValidateNested({ each: true })
  @Type(() => FormationSlotDto)
  slots: FormationSlotDto[];
}
