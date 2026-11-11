import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
@Injectable()
export class AuthService {
 constructor(private prisma:PrismaService,private jwt:JwtService){}
 async register(dto:RegisterDto){
  const email=dto.email.toLowerCase();
  if(await this.prisma.user.findUnique({where:{email}})) throw new ConflictException('E-mail já cadastrado.');
  if(await this.prisma.character.findUnique({where:{name:dto.characterName}})) throw new ConflictException('Nome indisponível.');
  const passwordHash=await bcrypt.hash(dto.password,12);
  const user=await this.prisma.user.create({data:{email,passwordHash,characters:{create:{name:dto.characterName,path:dto.path as any}}},include:{characters:true}});
  return this.issue(user.id,user.email,user.characters[0]);
 }
 async login(dto:LoginDto){
  const user=await this.prisma.user.findUnique({where:{email:dto.email.toLowerCase()},include:{characters:true}});
  if(!user||!(await bcrypt.compare(dto.password,user.passwordHash))) throw new UnauthorizedException('Credenciais inválidas.');
  return this.issue(user.id,user.email,user.characters[0]??null);
 }
 private issue(id:string,email:string,character:any){return {accessToken:this.jwt.sign({sub:id,email}),user:{id,email},character};}
}
