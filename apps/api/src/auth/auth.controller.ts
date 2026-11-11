import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from './account.util';
import { LoginDto, RegisterDto } from './dto';
import { AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';
import { TrustedFrontendGuard } from './trusted-frontend.guard';

type AuthResponse = {
  accessToken: string;
  user: unknown;
  character: unknown;
};

type SessionResponse = {
  cookie(name: string, value: string, options: ReturnType<typeof sessionCookieOptions>): unknown;
  clearCookie(name: string, options: Omit<ReturnType<typeof sessionCookieOptions>, 'maxAge'>): unknown;
};

@Controller('auth')
@UseGuards(TrustedFrontendGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: SessionResponse,
  ) {
    return this.setSessionCookie(response, await this.auth.register(dto));
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: SessionResponse,
  ) {
    return this.setSessionCookie(response, await this.auth.login(dto));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  current(@Req() request: AuthenticatedRequest) {
    return this.auth.current(request.user.sub);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: SessionResponse) {
    const { maxAge: _maxAge, ...cookieOptions } = sessionCookieOptions();
    response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    return { ok: true };
  }

  private setSessionCookie(response: SessionResponse, result: AuthResponse) {
    response.cookie(SESSION_COOKIE_NAME, result.accessToken, sessionCookieOptions());
    const { accessToken: _accessToken, ...publicResponse } = result;
    return publicResponse;
  }
}
