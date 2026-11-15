import { IsString, Matches } from 'class-validator';

const ITEM_CODE = /^[A-Z][A-Z_]{2,39}$/;

export class UseItemDto {
  @IsString()
  @Matches(ITEM_CODE)
  itemCode: string;
}
