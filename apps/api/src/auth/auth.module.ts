import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TrustedFrontendGuard } from './trusted-frontend.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
          throw new Error('JWT_SECRET deve ter ao menos 32 caracteres em produção.');
        }
        return {
          secret: secret ?? 'local-only-change-me',
          signOptions: { expiresIn: '2h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, TrustedFrontendGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, TrustedFrontendGuard],
})
export class AuthModule {}
