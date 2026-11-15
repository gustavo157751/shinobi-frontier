import { IsString, Matches } from 'class-validator';

const RECIPE_CODE = /^[A-Z][A-Z_]{2,39}$/;

export class CraftDto {
  @IsString()
  @Matches(RECIPE_CODE)
  recipeCode: string;
}
