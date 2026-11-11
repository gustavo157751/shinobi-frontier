import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { normalizeEmail, toPublicAccount } from './account.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('E-mail já cadastrado.');
    }
    if (await this.prisma.character.findUnique({ where: { name: dto.characterName } })) {
      throw new ConflictException('Nome indisponível.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            passwordHash,
            characters: {
              create: { name: dto.characterName, path: dto.path as any },
            },
          },
          include: { characters: true },
        });
        await tx.accountAuditEvent.create({
          data: { userId: created.id, event: 'REGISTERED' },
        });
        return created;
      });

      return this.issue(user, user.characters[0] ?? null);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('E-mail ou nome de personagem já cadastrado.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
      include: { characters: true },
    });

    if (
      !user ||
      user.status !== AccountStatus.ACTIVE ||
      user.deletedAt ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const loggedInAt = new Date();
    const account = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: loggedInAt },
        select: {
          id: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
      await tx.accountAuditEvent.create({
        data: { userId: user.id, event: 'LOGIN_SUCCEEDED' },
      });
      return updated;
    });

    return {
      accessToken: this.jwt.sign({ sub: user.id }),
      user: toPublicAccount(account),
      character: user.characters[0] ?? null,
    };
  }

  private issue(user: {
    id: string;
    status: AccountStatus;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    characters: unknown[];
  }, character: unknown) {
    return {
      accessToken: this.jwt.sign({ sub: user.id }),
      user: toPublicAccount(user),
      character,
    };
  }
}
