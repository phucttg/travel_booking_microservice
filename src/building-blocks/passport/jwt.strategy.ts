import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TokenType } from '../contracts/identity.contract';
import configs from '../configs/configs';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configs.jwt.secret
    });
  }

  async validate(req: Request, payload: any) {
    if (payload?.type !== TokenType.ACCESS) {
      throw new UnauthorizedException('Only access tokens can be used for authenticated routes');
    }

    const authorizationHeader = req.headers.authorization;
    const token = typeof authorizationHeader === 'string'
      ? authorizationHeader.replace(/^Bearer\s+/i, '').trim()
      : '';

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    return { userId: payload.sub, role: payload.role, token };
  }
}
