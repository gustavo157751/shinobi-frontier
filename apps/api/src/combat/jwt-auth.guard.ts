import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user: { sub: string; email?: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers['authorization'];
    const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '';
    if (!token) throw new UnauthorizedException('Entre na sua conta para continuar.');

    try {
      request.user = await this.jwt.verifyAsync<{ sub: string; email?: string }>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    }
  }
}
