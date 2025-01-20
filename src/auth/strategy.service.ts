import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Request } from 'express';

type Payload = {
  sub: number;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      // jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      jwtFromRequest: (req: Request) => {
        // Utilisation de jwt-cookie pour vérifier et extraire le JWT
        const token = req.cookies?.jwt;
        if (!token) throw new UnauthorizedException('No JWT cookie found');
        return token;
      },
      secretOrKey: configService.get<string>('SECRET_KEY'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: Payload) {
    const user = await this.prismaService.user.findUnique({
      where: { email: payload.email },
    });
    if (!user) throw new UnauthorizedException('Unauthorized');
    Reflect.deleteProperty(user, 'password');
    console.log('user', user);
    return user;
  }
}
