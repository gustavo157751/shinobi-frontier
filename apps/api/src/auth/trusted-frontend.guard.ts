import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { trustedFrontendOrigin } from './account.util';

type OriginCheckedRequest = {
  method: string;
  headers: { origin?: string };
};

@Injectable()
export class TrustedFrontendGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OriginCheckedRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) return true;

    const origin = request.headers.origin;
    if (!origin || origin !== trustedFrontendOrigin()) {
      throw new ForbiddenException('Origem da requisição não autorizada.');
    }
    return true;
  }
}
