import { IsEmail, IsString, Length, Matches, IsIn } from 'class-validator';
export class RegisterDto {
 @IsEmail() email: string;
 @IsString() @Length(10,72) password: string;
 @IsString() @Length(3,18) @Matches(/^[A-Za-z0-9_]+$/) characterName: string;
 @IsString() @IsIn(['SHADOW_BLADE','FLAME_EYE','WIND_DANCER','WATER_CLAW','STONE_FIST']) path: string;
}
export class LoginDto { @IsEmail() email: string; @IsString() @Length(10,72) password: string; }
