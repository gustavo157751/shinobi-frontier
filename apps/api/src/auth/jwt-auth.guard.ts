import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { readSessionCookie } from './account.util';

export interface AuthenticatedRequest {
  headers: { cookie?: string };
  user: { sub: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readSessionCookie(request.headers.cookie);
    if (!token) throw new UnauthorizedException('Entre na sua conta para continuar.');

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }

    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }
    const account = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true, deletedAt: true },
    });
    if (!account || account.status !== AccountStatus.ACTIVE || account.deletedAt) {
      throw new UnauthorizedException('Sua conta não está disponível.');
    }

    request.user = payload;
    return true;
  }
}
