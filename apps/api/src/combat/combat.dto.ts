import { IsIn } from 'class-validator';

export class CombatActionDto {
  @IsIn(['strike', 'technique', 'guard'])
  action: 'strike' | 'technique' | 'guard';
}
