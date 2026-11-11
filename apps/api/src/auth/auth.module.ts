import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET??'local-only-change-me',signOptions:{expiresIn:'2h'}})],controllers:[AuthController],providers:[AuthService],exports:[AuthService]})
export class AuthModule {}
