import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    const validRoles = Object.values(UserRole);
    if (
      !payload.sub ||
      !payload.tenantId ||
      !Array.isArray(payload.roles) ||
      !payload.roles.every((role) => validRoles.includes(role))
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    return payload;
  }
}
